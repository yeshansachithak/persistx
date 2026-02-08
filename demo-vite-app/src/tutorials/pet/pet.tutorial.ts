// src/tutorials/pet/pet.tutorial.ts

import type { Tutorial, UiField } from "../../tutorial/types";

/**
 * PersistX Interactive Tutorial — Pet Form
 *
 * DATA ONLY — no UI, no React.
 * Engine + Runner interpret this.
 *
 * Teaching pattern:
 *  - hint          = Do (what the learner should do now)
 *  - explain[0]    = Why (one-liner used by TutorialControls)
 *  - expect.shouldSee = Expect (what the learner should observe)
 */

const baseFieldsV1: UiField[] = [
    {
        key: "petName",
        label: "Pet Name",
        type: "text",
        placeholder: "Fluffy",
        required: true,
    },
    {
        key: "petType",
        label: "Pet Type",
        type: "text",
        placeholder: "Cat",
        required: true,
        note: "In v1 this field is called petType. Later we'll rename it safely.",
    },
];

export const petTutorial: Tutorial = {
    id: "pet",
    title: "Pet Form",
    description:
        "Learn PersistX with a story: baseline save → add a field (schema mismatch) → rename a field safely using aliases.",

    // IMPORTANT: works in dev (/) and GitHub Pages (/persistx/)
    schemaBaseUrl: `${import.meta.env.BASE_URL}schemas/pet`.replace(/\/+$/, ""),

    forms: {
        petProfile: {
            formKey: "petProfile",
            title: "Pet Profile",
            description: "A simple form used to demonstrate schema evolution safely.",
            defaultContext: { uid: "demo-user-001" },
            uiFields: baseFieldsV1,
            samples: {
                "v1 payload (minimal)": {
                    petName: "Fluffy",
                    petType: "Cat",
                },
                "v1 payload (with unknown key)": {
                    petName: "Fluffy",
                    petType: "Cat",
                    extraFieldShouldFail: "nope",
                },
            },
        },
    },

    stories: [
        // ============================================================
        // STORY 1 — BASELINE (v1)
        // ============================================================
        {
            id: "baseline",
            title: "Baseline",
            description: "UI and schema match. Saving should just work.",
            steps: [
                {
                    id: "s1-intro",
                    title: "Contract in action (happy path)",
                    hint: "Do: Click Analyze, then Save.",
                    explain: [
                        "Why: PersistX enforces a schema contract so only valid, mapped data reaches storage.",
                        "Your app calls one line: persistx.submit(formKey, payload, { uid }).",
                        "Analyze lets you preview: validate → normalize → map → unknown detection.",
                    ],
                    enter: {
                        formKey: "petProfile",
                        schemaRef: {
                            kind: "snapshot",
                            file: "schema.v1.json",
                            versionLabel: "v1",
                        },
                        payloadMode: "form",
                        initialFormValues: {
                            petName: "Fluffy",
                            petType: "Cat",
                        },
                        lock: { formKey: true },
                    },
                    actions: [
                        {
                            id: "analyze",
                            label: "Preview mapping (Analyze)",
                            kind: "analyze",
                            tone: "secondary",
                            help: "See normalized + mapped output before saving.",
                        },
                        {
                            id: "save",
                            label: "Save",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                            help: "PersistX validates + maps the payload, then the adapter stores it.",
                        },
                        {
                            id: "next",
                            label: "Continue",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "Analyze Output shows mapped keys for schema v1",
                            "Submit Output shows adapter request + DB snapshot",
                            "No unknownInPayload keys when payload matches schema",
                        ],
                    },
                },
            ],
        },

        // ============================================================
        // STORY 2 — ADD FIELD (schema mismatch)
        // ============================================================
        {
            id: "add-field",
            title: "Add field",
            description:
                "UI changes faster than schema. PersistX blocks drift until schema updates.",
            steps: [
                {
                    id: "s2-setup",
                    title: "Add a new UI field",
                    hint: "Do: Click “Add UI field: age”.",
                    explain: [
                        "Why: Frontend changes are fast, but the schema contract must be updated intentionally.",
                        "PersistX prevents silent schema drift (accidentally writing new shapes to DB).",
                    ],
                    enter: {
                        formKey: "petProfile",
                        schemaRef: {
                            kind: "snapshot",
                            file: "schema.v1.json",
                            versionLabel: "v1",
                        },
                        payloadMode: "form",
                        initialFormValues: {
                            petName: "Fluffy",
                            petType: "Cat",
                        },
                        lock: { formKey: true },
                    },
                    actions: [
                        {
                            id: "add-age-ui",
                            label: "Add UI field: age",
                            kind: "applyUiPatch",
                            tone: "primary",
                            help: "Simulates a UI change. Schema is still v1.",
                            patch: {
                                op: "addField",
                                field: {
                                    key: "age",
                                    label: "Age",
                                    type: "number",
                                    placeholder: "3",
                                    note: "New UI field (NOT in schema v1).",
                                },
                                afterKey: "petType",
                            },
                        },
                        {
                            id: "next",
                            label: "Continue",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "UI Form now includes the Age field",
                            "Schema panel is still v1 (no age field yet)",
                        ],
                    },
                },
                {
                    id: "s2-break",
                    title: "Contract breaks (expected failure)",
                    hint: "Do: Click Save (expected to fail).",
                    explain: [
                        "Why: Schema v1 does not allow the new key, so PersistX rejects the submission.",
                        "This makes changes reviewable: schema must evolve intentionally.",
                    ],
                    actions: [
                        {
                            id: "analyze",
                            label: "Preview mapping (Analyze)",
                            kind: "analyze",
                            tone: "secondary",
                            help: "Notice unknownInPayload includes age under schema v1.",
                        },
                        {
                            id: "save",
                            label: "Save (expected to fail)",
                            kind: "submit",
                            tone: "danger",
                            expect: "error",
                            expectedErrorContains: "age",
                            help: "PersistX blocks unknown keys when allowUnknownFields=false.",
                        },
                        {
                            id: "next",
                            label: "Continue",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "Result shows an error mentioning age (unknown / not allowed)",
                            "Analyze Output shows unknownInPayload includes age",
                        ],
                    },
                },
                {
                    id: "s2-fix",
                    title: "Fix by updating schema (v2)",
                    hint: "Do: Click “Update schema to v2”, then Save again.",
                    explain: [
                        "Why: Adding a new field is safe when you bump schema and include it explicitly.",
                        "Old clients still work; new clients can send age.",
                    ],
                    actions: [
                        {
                            id: "set-schema-v2",
                            label: "Update schema to v2 (allow age)",
                            kind: "setSchema",
                            tone: "primary",
                            schemaRef: {
                                kind: "snapshot",
                                file: "schema.v2.add-age.json",
                                versionLabel: "v2",
                            },
                            help: "Schema v2 includes age, so PersistX accepts it.",
                        },
                        {
                            id: "save",
                            label: "Save again",
                            kind: "submit",
                            tone: "secondary",
                            expect: "success",
                            help: "Now the same payload should pass and persist.",
                        },
                        {
                            id: "next",
                            label: "Continue",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "Schema panel shows v2 with age",
                            "Save succeeds and DB snapshot includes age",
                        ],
                    },
                },
            ],
        },

        // ============================================================
        // STORY 3 — RENAME FIELD (aliases)
        // ============================================================
        {
            id: "rename-field",
            title: "Rename field",
            description: "Renames require aliases. PersistX forces you to be explicit.",
            steps: [
                {
                    id: "s3-setup",
                    title: "Baseline on v2",
                    hint: "Do: Click Save (baseline).",
                    explain: [
                        "Why: Start from a known-good state before renaming anything.",
                    ],
                    enter: {
                        formKey: "petProfile",
                        schemaRef: {
                            kind: "snapshot",
                            file: "schema.v2.add-age.json",
                            versionLabel: "v2",
                        },
                        payloadMode: "form",
                        initialFormValues: {
                            petName: "Fluffy",
                            petType: "Cat",
                            age: 3,
                        },
                        lock: { formKey: true },
                    },
                    actions: [
                        {
                            id: "save",
                            label: "Save (baseline)",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                            help: "Everything matches schema v2.",
                        },
                        {
                            id: "next",
                            label: "Continue",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "Save succeeds on schema v2",
                            "DB snapshot uses petType (v2 key)",
                        ],
                    },
                },

                {
                    id: "s3-rename-ui",
                    title: "Rename in UI (break the contract)",
                    hint: "Do: Click “Rename field in UI”, then Analyze, then Save (expected to fail).",
                    explain: [
                        "Why: Renames are dangerous — different app versions may send different keys. PersistX will not guess; you must add an alias.",
                    ],
                    actions: [
                        {
                            id: "rename-ui",
                            label: "Rename field in UI: petType → type",
                            kind: "applyUiPatch",
                            tone: "primary",
                            help: "Simulates changing the frontend field name only (schema still v2).",
                            patch: {
                                op: "renameField",
                                from: "petType",
                                to: "type",
                                label: "Type",
                            },
                        },
                        {
                            id: "analyze",
                            label: "Preview mapping (Analyze)",
                            kind: "analyze",
                            tone: "secondary",
                            help: "Notice type becomes unknown under schema v2.",
                        },
                        {
                            id: "save",
                            label: "Save (expected to fail)",
                            kind: "submit",
                            tone: "danger",
                            expect: "error",
                            expectedErrorContains: "type",
                            help: "Schema v2 doesn't allow type yet, so PersistX rejects it.",
                        },
                        {
                            id: "next",
                            label: "Continue",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "Visual Diff shows petType → type",
                            "Analyze Output unknownInPayload includes type",
                            "Result shows an error mentioning type",
                        ],
                    },
                },

                {
                    id: "s3-fix",
                    title: "Fix with alias (schema v3)",
                    hint: "Do: Apply schema v3 (alias), then Analyze, then Save again.",
                    explain: [
                        "Why: Aliases keep old clients compatible while PersistX stores a single canonical key (type), preventing mixed database schemas.",
                    ],
                    actions: [
                        {
                            id: "copy-cli",
                            label: "Copy CLI: persistx diff --apply",
                            kind: "copyCli",
                            tone: "ghost",
                            command: "persistx diff --file ./schema.json --apply",
                            help: "Typical workflow: diff → review → apply aliases for renames.",
                        },
                        {
                            id: "set-schema-v3",
                            label: "Apply alias (schema v3)",
                            kind: "setSchema",
                            tone: "primary",
                            schemaRef: {
                                kind: "snapshot",
                                file: "schema.v3.rename-with-alias.json",
                                versionLabel: "v3",
                            },
                            help: "Schema v3 supports canonical type and accepts petType as an alias.",
                        },
                        {
                            id: "analyze",
                            label: "Preview mapping (Analyze)",
                            kind: "analyze",
                            tone: "secondary",
                            help: "Mapped output should show canonical key type.",
                        },
                        {
                            id: "save",
                            label: "Save again",
                            kind: "submit",
                            tone: "secondary",
                            expect: "success",
                            help: "Now the payload should map and save successfully.",
                        },
                        {
                            id: "next",
                            label: "Finish",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                    expect: {
                        shouldSee: [
                            "Visual Diff explains canonical type + alias petType",
                            "Analyze Output mapped keys include type (canonical)",
                            "Save succeeds; DB snapshot uses type (not petType)",
                        ],
                    },
                },
            ],
        },
    ],
};
