// src/tutorial/types.ts

export type TutorialId = string;
export type StoryId = string;
export type StepId = string;

export type FormKey = string;

/**
 * A tutorial is a "main story" package (e.g., Pet Form) composed of multiple stories
 * (e.g., Baseline, Add Field, Rename Field), and each story has multiple steps.
 *
 * Tutorials should be DATA, not UI: no React imports here.
 */
export type Tutorial = {
    id: TutorialId;
    title: string;
    description?: string;

    /**
     * Base URL to load schemas from (public folder).
     * Example: "/schemas/pet"
     *
     * The app can load schema snapshots like:
     * - `${schemaBaseUrl}/schema.v1.json`
     * - `${schemaBaseUrl}/schema.v2.add-age.json`
     */
    schemaBaseUrl: string;

    /**
     * Form configurations available within this tutorial.
     * Usually one for the main story (petProfile), but supports multiple.
     */
    forms: Record<FormKey, TutorialForm>;

    /**
     * Ordered stories under this tutorial.
     * Example: baseline -> add-field -> rename-field
     */
    stories: Story[];
};

export type TutorialForm = {
    formKey: FormKey;
    title: string;
    description?: string;

    /**
     * Defaults used by the demo runner (e.g., uid).
     * You can override per-step.
     */
    defaultContext?: PersistxDemoContext;

    /**
     * UI fields for rendering the "Form" panel. These are NOT schema fields —
     * they represent the frontend form inputs (which can diverge from schema during the story).
     */
    uiFields: UiField[];

    /**
     * Optional: samples shown in the payload picker (or "Load sample" dropdown).
     * Key is label shown to the user; value is a JSON-serializable object.
     */
    samples?: Record<string, Record<string, unknown>>;
};

export type Story = {
    id: StoryId;
    title: string;
    description?: string;

    /**
     * Steps are executed in order; the runner can provide Next/Back navigation.
     */
    steps: Step[];
};

export type Step = {
    id: StepId;
    title: string;

    /**
     * Short instruction displayed above the UI (what the learner should do).
     */
    hint?: string;

    /**
     * Optional longer explanation shown after actions or in a side panel.
     */
    explain?: string[];

    /**
     * Applies changes to the demo state when entering the step.
     * This is how we create the "story" without writing UI per-story.
     */
    enter?: StepEnter;

    /**
     * Actions available to the user in this step (buttons).
     * Example: Save, Update schema, Apply alias, Next, etc.
     */
    actions: StepAction[];

    /**
     * Optional step-level expectations.
     */
    expect?: StepExpectation;

    /**
     * --- UI convenience (optional) ---
     * Some panels read uiFields directly from the current step.
     * We keep this optional so tutorials can remain data-driven.
     *
     * If omitted, the runner should use the tutorial form's uiFields,
     * possibly patched by enter.uiPatches.
     */
    uiFields?: UiField[];
};

export type StepEnter = {
    /**
     * Choose which formKey is being taught in this step.
     */
    formKey?: FormKey;

    /**
     * Choose which schema snapshot/version is active.
     * If omitted, keeps current.
     */
    schemaRef?: SchemaRef;

    /**
     * Apply UI changes (add field, rename field, remove field) to the frontend form.
     * This affects what the "FormPanel" renders and what payload is produced when saving.
     */
    uiPatches?: UiPatch[];

    /**
     * Set the "payload mode" on entry.
     */
    payloadMode?: PayloadMode;

    /**
     * If payloadMode is "json"/"raw", set initial JSON payload object (runner will stringify).
     * If payloadMode is "form", set default input values for the form.
     */
    initialPayload?: Record<string, unknown>;
    initialFormValues?: Record<string, unknown>;

    /**
     * Context defaults for PersistX calls (e.g., uid).
     * Merged over tutorial.form.defaultContext.
     */
    context?: Partial<PersistxDemoContext>;

    /**
     * Locking rules for the step. Useful to prevent changing schema/formKey mid-step.
     */
    lock?: StepLock;
};

export type StepLock = {
    formKey?: boolean;
    schema?: boolean;
    payloadMode?: boolean;
    ui?: boolean;
    context?: boolean;

    /**
     * Optional: lock specific UI field keys (FormPanel expects this).
     * Example: ["petName"]
     */
    fields?: string[];
};

export type StepAction =
    | ActionSubmit
    | ActionAnalyze
    | ActionSetSchema
    | ActionApplyAlias
    | ActionApplyUiPatch
    | ActionCopyCli
    | ActionClearDb
    | ActionGoNext
    | ActionGoBack;

export type ActionBase = {
    id: string;
    label: string;
    kind: StepActionKind;

    /**
     * Optional helper text displayed under the button.
     */
    help?: string;

    /**
     * Optional styling hint.
     */
    tone?: "primary" | "secondary" | "ghost" | "danger";
};

export type StepActionKind =
    | "submit"
    | "analyze"
    | "setSchema"
    | "applyAlias"
    | "applyUiPatch"
    | "copyCli"
    | "clearDb"
    | "next"
    | "back";

export type ActionSubmit = ActionBase & {
    kind: "submit";

    /**
     * If set, temporarily override the schema used for submission.
     * Most steps will not need this (they use the active schemaRef).
     */
    schemaRef?: SchemaRef;

    /**
     * What we expect to happen when user clicks Submit.
     */
    expect?: "success" | "error";

    /**
     * If expect=error, we can match message substring.
     */
    expectedErrorContains?: string;
};

export type ActionAnalyze = ActionBase & {
    kind: "analyze";
};

export type ActionSetSchema = ActionBase & {
    kind: "setSchema";
    schemaRef: SchemaRef;
};

export type ActionApplyAlias = ActionBase & {
    kind: "applyAlias";

    /**
     * Apply alias to a schema definition (demo-only). Used to simulate CLI diff --apply.
     *
     * Example: in v2, targetKey="type", alias="petType"
     */
    formKey: FormKey;
    version: number;
    targetKey: string;
    alias: string;
};

export type ActionApplyUiPatch = ActionBase & {
    kind: "applyUiPatch";
    patch: UiPatch;
};

export type ActionCopyCli = ActionBase & {
    kind: "copyCli";
    /**
     * A shell command shown & copied to clipboard.
     */
    command: string;
};

export type ActionClearDb = ActionBase & {
    kind: "clearDb";
};

export type ActionGoNext = ActionBase & {
    kind: "next";
};

export type ActionGoBack = ActionBase & {
    kind: "back";
};

export type StepExpectation = {
    /**
     * Optional note shown to user like "You should see mapped.type"
     */
    shouldSee?: string[];

    /**
     * Optional "checklist" values.
     */
    checks?: Record<string, string>;
};

/**
 * SchemaRef identifies which schema snapshot is active in the demo.
 * We use snapshot files rather than mutating schema.json.
 */
export type SchemaRef =
    | { kind: "snapshot"; file: string; versionLabel?: string }
    | { kind: "version"; version: number; versionLabel?: string };

/**
 * The mode used for user payload input.
 * - "form": payload is built from UI inputs (recommended)
 * - "json": payload is edited as JSON text
 * - "raw": alias for older UI code that uses "raw"
 *
 * NOTE: "raw" and "json" mean the same thing in Phase 1.
 */
export type PayloadMode = "form" | "json" | "raw";

/**
 * UI field definition for the rendered form panel.
 * This is independent of PersistX schema fields.
 */
export type UiField = {
    key: string;
    label: string;
    type: UiFieldType;
    placeholder?: string;
    note?: string;
    required?: boolean;
    disabled?: boolean;

    /**
     * If true, hidden but still may be included in payload.
     */
    hidden?: boolean;
};

export type UiFieldType = "text" | "number" | "textarea" | "select" | "boolean";

/**
 * UiPatch operations let us "evolve" the frontend form during the tutorial,
 * without writing new components per step.
 */
export type UiPatch =
    | {
        op: "addField";
        field: UiField;
        /**
         * Optionally insert after a given key, else appended.
         */
        afterKey?: string;
    }
    | {
        op: "removeField";
        key: string;
    }
    | {
        op: "renameField";
        from: string;
        to: string;
        /**
         * Optional label update when renaming.
         */
        label?: string;
    }
    | {
        op: "setField";
        key: string;
        patch: Partial<UiField>;
    };

/**
 * Context passed to PersistX calls.
 */
export type PersistxDemoContext = {
    uid?: string;
    nowISO?: string;
};

/**
 * Result objects used by the demo UI panels.
 * Keep this UI-friendly and serializable.
 */
export type AnalyzeOutput = {
    formKey: string;
    schemaVersion: number;
    validation: unknown;
    normalized: Record<string, unknown>;
    mapped: Record<string, unknown>;
    unknownInPayload: string[];
    definition?: unknown;
};

export type SubmitOutput =
    | {
        ok: true;
        result: unknown;
        lastAdapterRequest?: unknown;
        db?: unknown;
    }
    | {
        ok: false;
        error: string;
        details?: unknown;
    };
