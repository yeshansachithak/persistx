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
    SubmitOutput
} from "./types";

export type PersistxRuntime = {
    /**
     * Real PersistX engine: created via createPersistx({ adapter, registry })
     * Must support submit(formKey, payload, { uid, schemaVersion? })
     */
    persistx: {
        submit: (
            formKey: string,
            payload: Record<string, unknown>,
            opts?: { uid?: string; schemaVersion?: number; mode?: "create" | "update" | "upsert" }
        ) => Promise<any>;
    };

    /**
     * Demo-only analyzer helper that exposes validate/normalize/map
     * (your persistxClient.ts can provide this)
     */
    analyze: (formKey: string, payload: Record<string, unknown>, schemaVersion?: number) => any;

    /**
     * Demo adapter (in-memory) that exposes _db and last request for UI visibility.
     */
    adapter: any;

    /**
     * Registry is useful for "version" based schemaRefs (optional).
     */
    registry?: any;
};

export type SchemaSnapshot = {
    persistx: number;
    definitions: any[];
};

export type SchemaLoader = (schemaRef: SchemaRef) => Promise<SchemaSnapshot>;

export type TutorialEngineDeps = {
    tutorial: Tutorial;
    runtime: PersistxRuntime;
    loadSchema: SchemaLoader;

    /**
     * Initial UI fields for the active formKey.
     * Typically tutorial.forms[formKey].uiFields
     */
    initialUiFields: UiField[];

    /**
     * Initial form values for inputs in "form" payloadMode.
     */
    initialFormValues?: Record<string, unknown>;

    /**
     * Initial payload text for "json" payloadMode (stringified JSON).
     */
    initialPayloadJsonText?: string;

    /**
     * Initial payload mode
     */
    initialPayloadMode?: PayloadMode;

    /**
     * Initial context (uid, etc.)
     */
    initialContext?: PersistxDemoContext;

    /**
     * Initial schemaRef
     */
    initialSchemaRef: SchemaRef;

    /**
     * Initial formKey
     */
    initialFormKey: string;
};

export type TutorialEngineState = {
    tutorial: Tutorial;

    // navigation
    currentStoryIndex: number;
    currentStepIndex: number;

    // active selections
    formKey: string;
    schemaRef: SchemaRef;
    schemaSnapshot?: SchemaSnapshot;
    payloadMode: PayloadMode;

    // UI + payload
    uiFields: UiField[];
    formValues: Record<string, unknown>;
    payloadJsonText?: string;

    // context
    context: PersistxDemoContext;

    // outputs
    analyzeOutput?: AnalyzeOutput;
    submitOutput?: SubmitOutput;

    // misc
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
                if (exists) {
                    // If already exists, treat as no-op (tutorial steps may replay)
                    break;
                }
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
                        note: f.note
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

/**
 * Build payload from "form mode" values, using uiFields order.
 * - excludes hidden fields (unless user has a value and you want to include)
 * - excludes undefined / empty string (keep 0/false)
 */
export function buildPayloadFromForm(uiFields: UiField[], formValues: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const f of uiFields) {
        if (f.hidden) continue;

        const v = formValues[f.key];

        // normalize empty string -> undefined
        if (typeof v === "string" && v.trim() === "") continue;

        // allow 0, false, null, non-empty strings, objects, etc.
        if (v !== undefined) payload[f.key] = v;
    }

    return payload;
}

/**
 * Parse JSON payload from text (json mode).
 */
export function parseJsonPayload(text: string): EngineResult<Record<string, unknown>> {
    try {
        const obj = JSON.parse(text);
        if (!isObjectRecord(obj)) return { ok: false, error: "Payload must be a JSON object (not array/null)." };
        return { ok: true, value: obj };
    } catch (e: any) {
        return { ok: false, error: e?.message ?? "Invalid JSON" };
    }
}

/**
 * Resolve schema version number from SchemaRef if possible.
 * If SchemaRef is snapshot, we infer version from versionLabel when numeric (optional),
 * otherwise we return undefined and let the runtime decide (latest / internal).
 */
export function resolveSchemaVersion(schemaRef: SchemaRef): number | undefined {
    if (schemaRef.kind === "version") return schemaRef.version;

    // snapshot: try parse from versionLabel like "v2" or "2"
    const lbl = schemaRef.versionLabel ?? "";
    const m = lbl.match(/(\d+)/);
    if (m) return Number(m[1]);
    return undefined;
}

/**
 * Create engine with state + pure operations.
 * React layer (TutorialRunner) should call these and set state.
 */
export function createTutorialEngine(deps: TutorialEngineDeps) {
    const t = deps.tutorial;

    const story0 = getStory(t, 0);
    const step0 = getStep(story0, 0);

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
        lastError: undefined
    };

    /**
     * Apply Step.enter to state when entering a step.
     * This is what makes tutorials data-driven.
     */
    async function applyEnter(state: TutorialEngineState, enter?: StepEnter): Promise<TutorialEngineState> {
        if (!enter) return state;

        let next = { ...state };

        if (enter.formKey) {
            next.formKey = enter.formKey;
            // Reset UI fields to tutorial default for that formKey
            const f = t.forms[enter.formKey];
            if (f) next.uiFields = clone(f.uiFields);
        }

        if (enter.schemaRef) {
            next.schemaRef = enter.schemaRef;
            next.schemaSnapshot = await deps.loadSchema(enter.schemaRef);
        }

        if (enter.payloadMode) {
            next.payloadMode = enter.payloadMode;
        }

        if (enter.uiPatches && enter.uiPatches.length) {
            next.uiFields = applyUiPatches(next.uiFields, enter.uiPatches);
        }

        if (enter.initialFormValues) {
            next.formValues = { ...next.formValues, ...clone(enter.initialFormValues) };
        }

        if (enter.initialPayload) {
            // If step provides an object payload, sync json text too (useful for json mode).
            const txt = prettyJson(enter.initialPayload);
            next.payloadJsonText = txt;
            // If in form mode, also best-effort copy to formValues
            next.formValues = { ...next.formValues, ...clone(enter.initialPayload) };
        }

        if (enter.context) {
            next.context = { ...next.context, ...clone(enter.context) };
        }

        // Clear previous outputs when step changes
        next.analyzeOutput = undefined;
        next.submitOutput = undefined;
        next.lastError = undefined;

        return next;
    }

    /**
     * Ensure schemaSnapshot is loaded for current state.
     */
    async function ensureSchemaLoaded(state: TutorialEngineState): Promise<TutorialEngineState> {
        if (state.schemaSnapshot) return state;
        const snap = await deps.loadSchema(state.schemaRef);
        return { ...state, schemaSnapshot: snap };
    }

    /**
     * Navigate to a specific step (storyIdx, stepIdx), applying Step.enter.
     */
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
            submitOutput: undefined
        };

        next = await ensureSchemaLoaded(next);
        next = await applyEnter(next, step.enter);

        return next;
    }

    /**
     * Compute payload based on payloadMode.
     */
    function getCurrentPayload(state: TutorialEngineState): EngineResult<Record<string, unknown>> {
        if (state.payloadMode === "json") {
            const txt = state.payloadJsonText ?? "{}";
            return parseJsonPayload(txt);
        }
        const payload = buildPayloadFromForm(state.uiFields, state.formValues);
        return { ok: true, value: payload };
    }

    /**
     * Analyze: validatePayload + normalizePayload + mapPayload (via runtime helper).
     */
    async function analyze(state: TutorialEngineState): Promise<TutorialEngineState> {
        const payloadRes = getCurrentPayload(state);
        if (!payloadRes.ok) {
            return { ...state, analyzeOutput: undefined, lastError: payloadRes.error };
        }

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
                definition: out?.def
            };

            return { ...state, analyzeOutput, lastError: undefined };
        } catch (e: any) {
            return { ...state, analyzeOutput: undefined, lastError: e?.message ?? String(e) };
        }
    }

    /**
     * Submit: calls persistx.submit and records adapter request + db snapshot.
     */
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
                schemaVersion
            });

            const submitOutput: SubmitOutput = {
                ok: true,
                result,
                lastAdapterRequest: deps.runtime.adapter?._last ?? deps.runtime.adapter?._lastRequest ?? null,
                db: deps.runtime.adapter?._db ?? null
            };

            // If the step expected an error but we succeeded, we still return success but mark lastError.
            if (expect === "error") {
                const msg = "This step expected an error, but Save succeeded.";
                return { ...state, submitOutput, lastError: msg };
            }

            return { ...state, submitOutput, lastError: undefined };
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            const submitOutput: SubmitOutput = { ok: false, error: msg };

            // If the step expected success but errored, surface it.
            if (expect === "success") {
                return { ...state, submitOutput, lastError: msg };
            }

            // If we expected an error, optionally verify it contains a substring.
            if (expect === "error" && expectedErrorContains) {
                if (!msg.toLowerCase().includes(expectedErrorContains.toLowerCase())) {
                    const mismatch = `Expected error to contain "${expectedErrorContains}", but got: ${msg}`;
                    return { ...state, submitOutput, lastError: mismatch };
                }
            }

            return { ...state, submitOutput, lastError: undefined };
        }
    }

    /**
     * Clear demo DB.
     */
    function clearDb(state: TutorialEngineState): TutorialEngineState {
        try {
            if (deps.runtime.adapter) {
                // common pattern used in demo adapter
                if (deps.runtime.adapter._db) deps.runtime.adapter._db = {};
                if ("_last" in deps.runtime.adapter) deps.runtime.adapter._last = undefined;
                if ("_lastRequest" in deps.runtime.adapter) deps.runtime.adapter._lastRequest = undefined;
            }
            const submitOutput: SubmitOutput = {
                ok: true,
                result: { ok: true, message: "DB cleared" },
                lastAdapterRequest: null,
                db: deps.runtime.adapter?._db ?? null
            };
            return { ...state, submitOutput, analyzeOutput: undefined, lastError: undefined };
        } catch (e: any) {
            return { ...state, lastError: e?.message ?? String(e) };
        }
    }

    /**
     * Public API (used by TutorialRunner).
     */
    return {
        initialState,

        // navigation
        goto,
        next: async (state: TutorialEngineState) => {
            const story = getStory(t, state.currentStoryIndex);
            const isLastStep = state.currentStepIndex >= story.steps.length - 1;

            if (!isLastStep) return goto(state, state.currentStoryIndex, state.currentStepIndex + 1);

            const isLastStory = state.currentStoryIndex >= t.stories.length - 1;
            if (isLastStory) return state; // finished tutorial
            return goto(state, state.currentStoryIndex + 1, 0);
        },
        back: async (state: TutorialEngineState) => {
            if (state.currentStepIndex > 0) return goto(state, state.currentStoryIndex, state.currentStepIndex - 1);

            if (state.currentStoryIndex === 0) return state;
            const prevStory = getStory(t, state.currentStoryIndex - 1);
            return goto(state, state.currentStoryIndex - 1, prevStory.steps.length - 1);
        },

        // mutations
        setSchema: async (state: TutorialEngineState, schemaRef: SchemaRef) => {
            const snap = await deps.loadSchema(schemaRef);
            return {
                ...state,
                schemaRef,
                schemaSnapshot: snap,
                analyzeOutput: undefined,
                submitOutput: undefined,
                lastError: undefined
            };
        },
        applyUiPatch: (state: TutorialEngineState, patch: UiPatch) => {
            const nextFields = applyUiPatches(state.uiFields, [patch]);
            return { ...state, uiFields: nextFields };
        },
        setFormValues: (state: TutorialEngineState, values: Record<string, unknown>) => {
            return { ...state, formValues: values };
        },
        setPayloadMode: (state: TutorialEngineState, mode: PayloadMode) => {
            return { ...state, payloadMode: mode };
        },
        setPayloadJson: (state: TutorialEngineState, text: string) => {
            return { ...state, payloadJsonText: text };
        },
        setContext: (state: TutorialEngineState, ctx: Partial<PersistxDemoContext>) => {
            return { ...state, context: { ...state.context, ...ctx } };
        },

        // actions
        analyze: async (state: TutorialEngineState) => analyze(state),
        submit: async (
            state: TutorialEngineState,
            expect?: "success" | "error",
            expectedErrorContains?: string
        ) => submit(state, expect, expectedErrorContains),
        clearDb
    };
}
