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
 *
 * The TutorialRunner mutates this state in response to step transitions
 * and user actions.
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
};

/**
 * Actions exposed by the tutorial runner.
 * These map 1:1 with StepAction kinds.
 */
export type TutorialActions = {
    // navigation
    goNext(): void;
    goBack(): void;

    // schema
    setSchema(schemaRef: SchemaRef): void;

    // ui evolution
    applyUiPatch(patch: UiPatch): void;

    // payload / context
    setFormValues(values: Record<string, unknown>): void;
    setPayloadJson(text: string): void;
    setPayloadMode(mode: PayloadMode): void;
    setContext(ctx: Partial<PersistxDemoContext>): void;

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
    if (!ctx) {
        throw new Error("useTutorial must be used within <TutorialContext.Provider>");
    }
    return ctx;
}
