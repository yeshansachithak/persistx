// src/tutorial/TutorialContext.ts

import { createContext, useContext } from "react";
import type {
    Tutorial,
    Story,
    Step,
    FormKey,
    SchemaRef,
    PayloadMode,
    UiField,
    UiPatch,
    PersistxDemoContext,
    AnalyzeOutput,
    SubmitOutput
} from "./types";

/**
 * TutorialState represents the *entire* interactive tutorial runtime state.
 * This is the single source of truth for the demo app.
 */
export type TutorialState = {
    tutorial: Tutorial;

    // navigation
    currentStoryIndex: number;
    currentStepIndex: number;

    // active selections
    formKey: FormKey;
    schemaRef: SchemaRef;
    payloadMode: PayloadMode;

    // UI + payload
    uiFields: UiField[];
    formValues: Record<string, unknown>;
    payloadJsonText?: string;

    // persistx context
    context: PersistxDemoContext;

    // results
    analyzeOutput?: AnalyzeOutput;
    submitOutput?: SubmitOutput;

    // misc
    isBusy?: boolean;
    lastError?: string;

    /**
     * ---- Compatibility aliases for UI panels ----
     * Some UI components were written against a slightly different naming.
     * We expose aliases so the rest of the app can stay stable.
     */
    // used by CodePanel + others
    activeFormKey?: FormKey;

    // used by CodePanel (it checks for "raw" mode)
    rawPayloadText?: string;

    // used by SchemaPanel
    schemaSnapshot?: unknown;

    // used by ResultPanel
    lastAnalysis?: AnalyzeOutput;
    lastSubmitResult?: SubmitOutput;
};

/**
 * Actions exposed by the tutorial runner.
 * These map 1:1 with StepAction kinds.
 */
export type TutorialActions = {
    // navigation
    goNext(): void;
    goBack(): void;

    /**
     * Optional “jump to step” (used by StepNavigator dot-click).
     * Phase 1 can support it safely within the current story.
     */
    goToStep?(stepIndex: number): void;

    // schema
    setSchema(schemaRef: SchemaRef): void;

    // ui evolution
    applyUiPatch(patch: UiPatch): void;

    // payload / context
    setFormValues(values: Record<string, unknown>): void;
    setPayloadJson(text: string): void;
    setPayloadMode(mode: PayloadMode): void;
    setContext(ctx: Partial<PersistxDemoContext>): void;

    /**
     * Fine-grained form editing (used by FormPanel)
     * Implemented in TutorialRunner using setFormValues under the hood.
     */
    updateFormValue?(key: string, value: unknown): void;

    // persistx actions
    analyze(): Promise<void>;
    submit(expect?: "success" | "error", expectedErrorContains?: string): Promise<void>;

    // utilities
    clearDb(): void;
    resetStep(): void;
};

/**
 * Combined context value.
 */
export type TutorialContextValue = {
    state: TutorialState;
    actions: TutorialActions;

    // derived helpers
    story: Story;
    step: Step;
    isFirstStep: boolean;
    isLastStep: boolean;

    /**
     * Convenience aliases (so some components can destructure directly).
     * (Not required, but harmless + nice.)
     */
    updateFormValue?: (key: string, value: unknown) => void;
};

/**
 * React Context.
 * Provider is created in TutorialRunner.
 */
export const TutorialContext = createContext<TutorialContextValue | null>(null);

/**
 * Hook used by UI components (panels, controls).
 */
export function useTutorial(): TutorialContextValue {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error("useTutorial must be used within <TutorialContext.Provider>");
    return ctx;
}
