// src/tutorial/TutorialRunner.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import type { Tutorial, StepAction, Step } from "./types";
import { TutorialContext } from "./TutorialContext";
import { createTutorialEngine, type TutorialEngineState } from "./engine";

/**
 * The TutorialRunner is the "heart" of the demo.
 *
 * Responsibilities:
 * - Loads runtime dependencies (PersistX + schema snapshots)
 * - Creates the tutorial engine (pure state machine)
 * - Applies step.enter on navigation
 * - Exposes state + actions via TutorialContext
 *
 * UI panels and controls consume TutorialContext and never touch story logic.
 */

type TutorialRunnerProps = {
    tutorial: Tutorial;

    /**
     * Provide a runtime created by your persistx client layer (src/persistx/persistxClient.ts).
     * Expected shape matches engine.ts PersistxRuntime.
     */
    runtime: {
        persistx: {
            submit: (
                formKey: string,
                payload: Record<string, unknown>,
                opts?: { uid?: string; schemaVersion?: number; mode?: "create" | "update" | "upsert" }
            ) => Promise<any>;
        };
        analyze: (formKey: string, payload: Record<string, unknown>, schemaVersion?: number) => any;
        adapter: any;
        registry?: any;
    };

    /**
     * Schema loader for snapshot files. Should load from tutorial.schemaBaseUrl.
     * We keep it outside the engine so it can be swapped/tested.
     */
    loadSchema: (
        schemaRef:
            | { kind: "snapshot"; file: string; versionLabel?: string }
            | { kind: "version"; version: number; versionLabel?: string }
    ) => Promise<any>;

    /**
     * Render-prop: children render the actual UI (panels/layout).
     * They will consume TutorialContext.
     */
    children: React.ReactNode;
};

export default function TutorialRunner(props: TutorialRunnerProps) {
    const { tutorial, runtime, loadSchema, children } = props;

    // ---------- bootstrapping defaults ----------
    const defaultFormKey = useMemo(() => {
        const keys = Object.keys(tutorial.forms);
        if (!keys.length) throw new Error("Tutorial has no forms");
        return keys[0]!;
    }, [tutorial]);

    const defaultSchemaRef = useMemo(() => {
        // Convention only; step.enter should set schemaRef explicitly.
        return { kind: "snapshot" as const, file: "schema.v1.json", versionLabel: "v1" };
    }, []);

    const initialUiFields = useMemo(() => {
        return tutorial.forms[defaultFormKey]?.uiFields ?? [];
    }, [tutorial, defaultFormKey]);

    // ---------- engine ----------
    const engineRef = useRef<ReturnType<typeof createTutorialEngine> | null>(null);
    const [state, setState] = useState<TutorialEngineState | null>(null);

    useEffect(() => {
        const engine = createTutorialEngine({
            tutorial,
            runtime,
            loadSchema,
            initialUiFields,
            initialFormValues: {},
            initialPayloadMode: "form",
            initialContext: tutorial.forms[defaultFormKey]?.defaultContext ?? {},
            initialSchemaRef: defaultSchemaRef,
            initialFormKey: defaultFormKey
        });

        engineRef.current = engine;

        (async () => {
            // Apply step.enter for the first step immediately (also ensures schema is loaded).
            const s0 = await engine.goto(engine.initialState, 0, 0);
            setState(s0);
        })().catch((e: any) => {
            setState({
                ...engine.initialState,
                lastError: e?.message ?? String(e)
            });
        });
    }, [tutorial, runtime, loadSchema, initialUiFields, defaultFormKey, defaultSchemaRef]);

    // ---------- derived helpers ----------
    const ctxValue = useMemo(() => {
        if (!state) return null;

        const engine = engineRef.current!;
        const story = tutorial.stories[state.currentStoryIndex]!;
        const step0 = story.steps[state.currentStepIndex]!;

        // IMPORTANT:
        // Some UI components were written expecting:
        //  - step.uiFields (but Step type is data-only and does not include uiFields)
        //  - step.enter.lock.fields (not part of StepLock in early drafts)
        // We provide a "UI-friendly" step object derived from state + step0.
        const step: Step & { uiFields?: any } = {
            ...(step0 as any),
            uiFields: state.uiFields,
            enter: {
                ...(step0.enter as any),
                lock: {
                    ...((step0.enter as any)?.lock ?? {}),
                    fields: ((step0.enter as any)?.lock?.fields ?? []) as string[]
                }
            }
        };

        const isFirstStep = state.currentStoryIndex === 0 && state.currentStepIndex === 0;
        const isLastStep =
            state.currentStoryIndex === tutorial.stories.length - 1 &&
            state.currentStepIndex === tutorial.stories[tutorial.stories.length - 1]!.steps.length - 1;

        // Actions API exposed to UI
        const actions = {
            goNext: async () => {
                const next = await engine.next(state);
                setState(next);
            },
            goBack: async () => {
                const prev = await engine.back(state);
                setState(prev);
            },

            // StepNavigator dot navigation (within current story)
            goToStep: async (stepIndex: number) => {
                const bounded = Math.max(0, Math.min(stepIndex, story.steps.length - 1));
                const next = await engine.goto(state, state.currentStoryIndex, bounded);
                setState(next);
            },

            setSchema: async (schemaRef: any) => {
                const next = await engine.setSchema(state, schemaRef);
                setState(next);
            },
            applyUiPatch: (patch: any) => {
                const next = engine.applyUiPatch(state, patch);
                setState(next);
            },
            setFormValues: (values: Record<string, unknown>) => {
                const next = engine.setFormValues(state, values);
                setState(next);
            },
            // Used by FormPanel
            updateFormValue: (key: string, value: unknown) => {
                const nextValues = { ...(state.formValues ?? {}) };
                if (value === undefined) delete nextValues[key];
                else nextValues[key] = value;
                const next = engine.setFormValues(state, nextValues);
                setState(next);
            },
            setPayloadJson: (text: string) => {
                const next = engine.setPayloadJson(state, text);
                setState(next);
            },
            setPayloadMode: (mode: any) => {
                const next = engine.setPayloadMode(state, mode);
                setState(next);
            },
            setContext: (ctx: any) => {
                const next = engine.setContext(state, ctx);
                setState(next);
            },
            analyze: async () => {
                const next = await engine.analyze(state);
                setState(next);
            },
            submit: async (expect?: "success" | "error", expectedErrorContains?: string) => {
                const next = await engine.submit(state, expect, expectedErrorContains);
                setState(next);
            },
            clearDb: () => {
                const next = engine.clearDb(state);
                setState(next);
            },
            resetStep: async () => {
                const next = await engine.goto(state, state.currentStoryIndex, state.currentStepIndex);
                setState(next);
            }
        };

        // ---- Context state (plus compatibility aliases used by UI panels) ----
        const compatState = {
            tutorial,

            currentStoryIndex: state.currentStoryIndex,
            currentStepIndex: state.currentStepIndex,

            // canonical
            formKey: state.formKey,
            schemaRef: state.schemaRef,
            payloadMode: state.payloadMode,
            uiFields: state.uiFields,
            formValues: state.formValues,
            payloadJsonText: state.payloadJsonText,
            context: state.context,

            analyzeOutput: state.analyzeOutput,
            submitOutput: state.submitOutput,

            isBusy: state.isBusy,
            lastError: state.lastError,

            // compatibility aliases expected by existing panels
            activeFormKey: state.formKey,
            rawPayloadText: state.payloadJsonText, // CodePanel used to read rawPayloadText
            schemaSnapshot: (state as any).schemaSnapshot, // SchemaPanel expects this
            lastAnalysis: state.analyzeOutput, // ResultPanel expects lastAnalysis
            lastSubmitResult: state.submitOutput // ResultPanel expects lastSubmitResult
        };

        return {
            state: compatState as any,
            actions: actions as any,
            story,
            step,
            isFirstStep,
            isLastStep,
            // convenience alias so FormPanel can destructure updateFormValue directly
            updateFormValue: actions.updateFormValue
        };
    }, [state, tutorial]);

    if (!ctxValue) {
        return <div className="p-6 text-sm text-zinc-700">Loading tutorial…</div>;
    }

    return <TutorialContext.Provider value={ctxValue}>{children}</TutorialContext.Provider>;
}

/**
 * Optional helper: execute a StepAction from UI.
 * Panels/controls can either call actions directly, or use this dispatcher.
 */
export async function dispatchStepAction(action: StepAction, api: { actions: any }) {
    switch (action.kind) {
        case "analyze":
            await api.actions.analyze();
            return;

        case "submit":
            await api.actions.submit(action.expect, action.expectedErrorContains);
            return;

        case "setSchema":
            await api.actions.setSchema(action.schemaRef);
            return;

        case "applyUiPatch":
            await api.actions.applyUiPatch(action.patch);
            return;

        case "copyCli":
            await navigator.clipboard.writeText(action.command);
            return;

        case "clearDb":
            api.actions.clearDb();
            return;

        case "next":
            await api.actions.goNext();
            return;

        case "back":
            await api.actions.goBack();
            return;

        case "applyAlias":
            // For MVP we simulate alias via schema snapshot swapping (setSchema).
            throw new Error("applyAlias action not wired: use setSchema with alias snapshot for now.");
    }
}
