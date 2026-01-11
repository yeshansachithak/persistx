// src/tutorial/engine.ts

import type {
    Tutorial,
    Story,
    Step,
    StepEnter,
    SchemaRef,
    PayloadMode,
    UiField,
    UiPatch,
    PersistxDemoContext,
    AnalyzeOutput,
    SubmitOutput,
} from "./types";

export type SchemaSnapshot = {
    persistx: number;
    definitions: any[];
};

export type PersistxRuntime = {
    persistx: {
        submit: (
            formKey: string,
            payload: Record<string, unknown>,
            opts?: { uid?: string; schemaVersion?: number; mode?: "create" | "update" | "upsert" }
        ) => Promise<any>;
    };
    analyze: (formKey: string, payload: Record<string, unknown>, schemaVersion?: number) => any;
    adapter: any;

    /**
     * CRITICAL: used to rebuild registry + persistx for single-version snapshots.
     */
    setSchemaSnapshot?: (snapshot: SchemaSnapshot) => void;
};

export type SchemaLoader = (schemaRef: SchemaRef) => Promise<SchemaSnapshot>;

export type TutorialEngineDeps = {
    tutorial: Tutorial;
    runtime: PersistxRuntime;
    loadSchema: SchemaLoader;
    initialUiFields: UiField[];
    initialFormValues?: Record<string, unknown>;
    initialPayloadJsonText?: string;
    initialPayloadMode?: PayloadMode;
    initialContext?: PersistxDemoContext;
    initialSchemaRef: SchemaRef;
    initialFormKey: string;
};

export type TutorialEngineState = {
    tutorial: Tutorial;

    currentStoryIndex: number;
    currentStepIndex: number;

    formKey: string;
    schemaRef: SchemaRef;
    schemaSnapshot?: SchemaSnapshot;

    payloadMode: PayloadMode;

    uiFields: UiField[];
    formValues: Record<string, unknown>;
    payloadJsonText?: string;

    context: PersistxDemoContext;

    analyzeOutput?: AnalyzeOutput;
    submitOutput?: SubmitOutput;

    isBusy: boolean;
    lastError?: string;
};

export type EngineResult<T> = { ok: true; value: T } | { ok: false; error: string };

function clone<T>(v: T): T {
    return JSON.parse(JSON.stringify(v));
}

function prettyJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
}

function isObjectRecord(x: unknown): x is Record<string, unknown> {
    return !!x && typeof x === "object" && !Array.isArray(x);
}

function getStory(t: Tutorial, idx: number): Story {
    const s = t.stories[idx];
    if (!s) throw new Error(`Story index out of range: ${idx}`);
    return s;
}

function getStep(story: Story, idx: number): Step {
    const s = story.steps[idx];
    if (!s) throw new Error(`Step index out of range: ${idx}`);
    return s;
}

/**
 * Apply UI patches to uiFields in a deterministic way.
 */
export function applyUiPatches(uiFields: UiField[], patches: UiPatch[]): UiField[] {
    let fields = [...uiFields];

    for (const p of patches) {
        switch (p.op) {
            case "addField": {
                const exists = fields.some((f) => f.key === p.field.key);
                if (exists) break;

                if (p.afterKey) {
                    const idx = fields.findIndex((f) => f.key === p.afterKey);
                    if (idx >= 0) fields.splice(idx + 1, 0, p.field);
                    else fields.push(p.field);
                } else {
                    fields.push(p.field);
                }
                break;
            }

            case "removeField": {
                fields = fields.filter((f) => f.key !== p.key);
                break;
            }

            case "renameField": {
                fields = fields.map((f) => {
                    if (f.key !== p.from) return f;
                    return {
                        ...f,
                        key: p.to,
                        label: p.label ?? f.label,
                        note: f.note,
                    };
                });
                break;
            }

            case "setField": {
                fields = fields.map((f) => (f.key === p.key ? { ...f, ...p.patch } : f));
                break;
            }
        }
    }

    return fields;
}

export function buildPayloadFromForm(uiFields: UiField[], formValues: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const f of uiFields) {
        if (f.hidden) continue;

        const v = formValues[f.key];

        if (typeof v === "string" && v.trim() === "") continue;

        if (v !== undefined) payload[f.key] = v;
    }

    return payload;
}

export function parseJsonPayload(text: string): EngineResult<Record<string, unknown>> {
    try {
        const obj = JSON.parse(text);
        if (!isObjectRecord(obj)) return { ok: false, error: "Payload must be a JSON object (not array/null)." };
        return { ok: true, value: obj };
    } catch (e: any) {
        return { ok: false, error: e?.message ?? "Invalid JSON" };
    }
}

export function resolveSchemaVersion(schemaRef: SchemaRef): number | undefined {
    if (schemaRef.kind === "version") return schemaRef.version;

    const lbl = schemaRef.versionLabel ?? "";
    const m = lbl.match(/(\d+)/);
    if (m) return Number(m[1]);
    return undefined;
}

export function createTutorialEngine(deps: TutorialEngineDeps) {
    const t = deps.tutorial;

    // (removed unused step0)

    const initialState: TutorialEngineState = {
        tutorial: t,
        currentStoryIndex: 0,
        currentStepIndex: 0,

        formKey: deps.initialFormKey,
        schemaRef: deps.initialSchemaRef,
        schemaSnapshot: undefined,

        payloadMode: deps.initialPayloadMode ?? "form",

        uiFields: clone(deps.initialUiFields),
        formValues: clone(deps.initialFormValues ?? {}),
        payloadJsonText: deps.initialPayloadJsonText,

        context: clone(deps.initialContext ?? {}),

        analyzeOutput: undefined,
        submitOutput: undefined,

        isBusy: false,
        lastError: undefined,
    };

    function runtimeSwapSchema(snapshot: SchemaSnapshot) {
        deps.runtime.setSchemaSnapshot?.(snapshot);
    }

    async function applyEnter(state: TutorialEngineState, enter?: StepEnter): Promise<TutorialEngineState> {
        if (!enter) return state;

        let next = { ...state };

        if (enter.formKey) {
            next.formKey = enter.formKey;
            const f = t.forms[enter.formKey];
            if (f) next.uiFields = clone(f.uiFields);
        }

        if (enter.schemaRef) {
            next.schemaRef = enter.schemaRef;
            const snap = await deps.loadSchema(enter.schemaRef);
            next.schemaSnapshot = snap;
            runtimeSwapSchema(snap);
        }

        if (enter.payloadMode) {
            next.payloadMode = enter.payloadMode;
        }

        if (enter.uiPatches && enter.uiPatches.length) {
            next.uiFields = applyUiPatches(next.uiFields, enter.uiPatches);

            // IMPORTANT: if the patch contains renameField, migrate values too.
            for (const p of enter.uiPatches) {
                if (p.op === "renameField") {
                    const from = p.from;
                    const to = p.to;
                    if (from in next.formValues && !(to in next.formValues)) {
                        next.formValues = { ...next.formValues, [to]: next.formValues[from] };
                    }
                    // Optional: remove old key to prevent confusion
                    const { [from]: _drop, ...rest } = next.formValues;
                    next.formValues = rest;
                }
            }
        }

        if (enter.initialFormValues) {
            next.formValues = { ...next.formValues, ...clone(enter.initialFormValues) };
        }

        if (enter.initialPayload) {
            const txt = prettyJson(enter.initialPayload);
            next.payloadJsonText = txt;
            next.formValues = { ...next.formValues, ...clone(enter.initialPayload) };
        }

        if (enter.context) {
            next.context = { ...next.context, ...clone(enter.context) };
        }

        next.analyzeOutput = undefined;
        next.submitOutput = undefined;
        next.lastError = undefined;

        return next;
    }

    async function ensureSchemaLoaded(state: TutorialEngineState): Promise<TutorialEngineState> {
        if (state.schemaSnapshot) return state;
        const snap = await deps.loadSchema(state.schemaRef);
        runtimeSwapSchema(snap);
        return { ...state, schemaSnapshot: snap };
    }

    async function goto(state: TutorialEngineState, storyIdx: number, stepIdx: number): Promise<TutorialEngineState> {
        const story = getStory(t, storyIdx);
        const step = getStep(story, stepIdx);

        let next: TutorialEngineState = {
            ...state,
            currentStoryIndex: storyIdx,
            currentStepIndex: stepIdx,
            isBusy: false,
            lastError: undefined,
            analyzeOutput: undefined,
            submitOutput: undefined,
        };

        next = await ensureSchemaLoaded(next);
        next = await applyEnter(next, step.enter);

        return next;
    }

    function getCurrentPayload(state: TutorialEngineState): EngineResult<Record<string, unknown>> {
        if (state.payloadMode === "json") {
            const txt = state.payloadJsonText ?? "{}";
            return parseJsonPayload(txt);
        }
        const payload = buildPayloadFromForm(state.uiFields, state.formValues);
        return { ok: true, value: payload };
    }

    async function analyze(state: TutorialEngineState): Promise<TutorialEngineState> {
        const payloadRes = getCurrentPayload(state);
        if (!payloadRes.ok) return { ...state, analyzeOutput: undefined, lastError: payloadRes.error };

        const version = resolveSchemaVersion(state.schemaRef);

        try {
            const out = deps.runtime.analyze(state.formKey, payloadRes.value, version);

            const analyzeOutput: AnalyzeOutput = {
                formKey: state.formKey,
                schemaVersion: out?.version ?? version ?? -1,
                validation: out?.validation,
                normalized: out?.normalized ?? {},
                mapped: out?.mapped ?? {},
                unknownInPayload: out?.unknownInPayload ?? [],
                definition: out?.def,
            };

            return { ...state, analyzeOutput, lastError: undefined };
        } catch (e: any) {
            return { ...state, analyzeOutput: undefined, lastError: e?.message ?? String(e) };
        }
    }

    async function submit(
        state: TutorialEngineState,
        expect?: "success" | "error",
        expectedErrorContains?: string
    ): Promise<TutorialEngineState> {
        const payloadRes = getCurrentPayload(state);
        if (!payloadRes.ok) {
            const submitOutput: SubmitOutput = { ok: false, error: payloadRes.error };
            return { ...state, submitOutput, lastError: payloadRes.error };
        }

        const schemaVersion = resolveSchemaVersion(state.schemaRef);

        try {
            const result = await deps.runtime.persistx.submit(state.formKey, payloadRes.value, {
                uid: state.context.uid,
                schemaVersion,
            });

            const submitOutput: SubmitOutput = {
                ok: true,
                result,
                lastAdapterRequest: deps.runtime.adapter?._last ?? deps.runtime.adapter?._lastRequest ?? null,
                db: deps.runtime.adapter?._db ?? null,
            };

            if (expect === "error") {
                return { ...state, submitOutput, lastError: "This step expected an error, but Save succeeded." };
            }

            return { ...state, submitOutput, lastError: undefined };
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            const detailsText =
                typeof e?.details === "string"
                    ? e.details
                    : e?.details
                        ? JSON.stringify(e.details, null, 2)
                        : "";

            const combined = `${msg}\n${detailsText}`.toLowerCase();

            const submitOutput: SubmitOutput = {
                ok: false,
                error: msg,
                details: detailsText || undefined
            };

            if (expect === "error" && expectedErrorContains) {
                if (!combined.includes(expectedErrorContains.toLowerCase())) {
                    return {
                        ...state,
                        submitOutput,
                        lastError: `Expected error to contain "${expectedErrorContains}", but got:\n\n${msg}\n\n${detailsText}`
                    };
                }
            }

            if (expect === "success") return { ...state, submitOutput, lastError: msg };

            return { ...state, submitOutput, lastError: undefined };
        }
    }

    function clearDb(state: TutorialEngineState): TutorialEngineState {
        try {
            if (deps.runtime.adapter) {
                if (deps.runtime.adapter._db) deps.runtime.adapter._db = {};
                if ("_last" in deps.runtime.adapter) deps.runtime.adapter._last = undefined;
                if ("_lastRequest" in deps.runtime.adapter) deps.runtime.adapter._lastRequest = undefined;
            }

            const submitOutput: SubmitOutput = {
                ok: true,
                result: { ok: true, message: "DB cleared" },
                lastAdapterRequest: null,
                db: deps.runtime.adapter?._db ?? null,
            };

            return { ...state, submitOutput, analyzeOutput: undefined, lastError: undefined };
        } catch (e: any) {
            return { ...state, lastError: e?.message ?? String(e) };
        }
    }

    return {
        initialState,

        goto,
        next: async (state: TutorialEngineState) => {
            const story = getStory(t, state.currentStoryIndex);
            const isLastStep = state.currentStepIndex >= story.steps.length - 1;

            if (!isLastStep) return goto(state, state.currentStoryIndex, state.currentStepIndex + 1);

            const isLastStory = state.currentStoryIndex >= t.stories.length - 1;
            if (isLastStory) return state;
            return goto(state, state.currentStoryIndex + 1, 0);
        },
        back: async (state: TutorialEngineState) => {
            if (state.currentStepIndex > 0) return goto(state, state.currentStoryIndex, state.currentStepIndex - 1);

            if (state.currentStoryIndex === 0) return state;
            const prevStory = getStory(t, state.currentStoryIndex - 1);
            return goto(state, state.currentStoryIndex - 1, prevStory.steps.length - 1);
        },

        setSchema: async (state: TutorialEngineState, schemaRef: SchemaRef) => {
            const snap = await deps.loadSchema(schemaRef);
            runtimeSwapSchema(snap);
            return {
                ...state,
                schemaRef,
                schemaSnapshot: snap,
                analyzeOutput: undefined,
                submitOutput: undefined,
                lastError: undefined,
            };
        },

        applyUiPatch: (state: TutorialEngineState, patch: UiPatch) => {
            const nextFields = applyUiPatches(state.uiFields, [patch]);

            // IMPORTANT: migrate values for renameField at action-time too
            let nextValues = state.formValues;
            if (patch.op === "renameField") {
                const from = patch.from;
                const to = patch.to;
                if (from in nextValues && !(to in nextValues)) {
                    nextValues = { ...nextValues, [to]: nextValues[from] };
                }
                const { [from]: _drop, ...rest } = nextValues;
                nextValues = rest;
            }

            return { ...state, uiFields: nextFields, formValues: nextValues };
        },

        setFormValues: (state: TutorialEngineState, values: Record<string, unknown>) => ({ ...state, formValues: values }),
        setPayloadMode: (state: TutorialEngineState, mode: PayloadMode) => ({ ...state, payloadMode: mode }),
        setPayloadJson: (state: TutorialEngineState, text: string) => ({ ...state, payloadJsonText: text }),
        setContext: (state: TutorialEngineState, ctx: Partial<PersistxDemoContext>) => ({
            ...state,
            context: { ...state.context, ...ctx },
        }),

        analyze: async (state: TutorialEngineState) => analyze(state),
        submit: async (state: TutorialEngineState, expect?: "success" | "error", expectedErrorContains?: string) =>
            submit(state, expect, expectedErrorContains),
        clearDb,
    };
}
