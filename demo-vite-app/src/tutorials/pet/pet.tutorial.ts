// src/tutorials/pet/pet.tutorial.ts

import type { Tutorial, UiField } from "../../tutorial/types";

/**
 * PersistX Interactive Tutorial — Pet Form
 *
 * This is DATA only. No React here.
 * The UI + runner will render steps, apply patches, and execute actions.
 *
 * We use schema snapshots (recommended) to keep the demo honest + simple:
 *  - public/schemas/pet/schema.v1.json
 *  - public/schemas/pet/schema.v2.add-age.json
 *  - public/schemas/pet/schema.v3.rename-with-alias.json
 */
const baseFieldsV1: UiField[] = [
    {
        key: "petName",
        label: "Pet Name",
        type: "text",
        placeholder: "Fluffy",
        required: true
    },
    {
        key: "petType",
        label: "Pet Type",
        type: "text",
        placeholder: "Cat",
        required: true,
        note: "In v1 the field is named petType. Later we'll rename it safely."
    }
];

export const petTutorial: Tutorial = {
    id: "pet",
    title: "Pet Form",
    description:
        "Learn PersistX with a story: baseline save → add a field (schema mismatch) → rename a field (aliases + CLI).",

    // Schemas are loaded from /public
    schemaBaseUrl: "/schemas/pet",

    forms: {
        petProfile: {
            formKey: "petProfile",
            title: "Pet Profile",
            description: "A simple form used to demonstrate schema evolution safely.",
            defaultContext: { uid: "demo-user-001" },
            uiFields: baseFieldsV1,
            samples: {
                "v1 payload (petType + unknown)": {
                    petName: "Fluffy",
                    petType: "Cat",
                    extraFieldShouldDrop: "lol"
                },
                "v1 payload (minimal)": {
                    petName: "Fluffy",
                    petType: "Cat"
                }
            }
        }
    },

    stories: [
        // ------------------------------------------------------------
        // STORY 1 — BASELINE (v1)
        // ------------------------------------------------------------
        {
            id: "baseline",
            title: "Story 1 — Version 1 (happy path)",
            description: "Start with a schema + matching UI. Saving should just work.",
            steps: [
                {
                    id: "s1-intro",
                    title: "Welcome",
                    hint:
                        "You have a pet form and a PersistX schema (v1). Save a valid payload and see what reaches the adapter.",
                    explain: [
                        "PersistX is a schema gatekeeper (contract).",
                        "When UI + schema match, PersistX stays out of your way.",
                        "Your app calls a single line of code: persistx.submit(formKey, payload, { uid })."
                    ],
                    enter: {
                        formKey: "petProfile",
                        schemaRef: { kind: "snapshot", file: "schema.v1.json", versionLabel: "v1" },
                        payloadMode: "form",
                        initialFormValues: {
                            petName: "Fluffy",
                            petType: "Cat"
                        },
                        lock: {
                            // In story intro, we keep things simple
                            formKey: true
                        }
                    },
                    actions: [
                        {
                            id: "analyze",
                            label: "Analyze (validate → normalize → map)",
                            kind: "analyze",
                            tone: "secondary",
                            help: "See how PersistX processes the payload before saving."
                        },
                        {
                            id: "save",
                            label: "Save (persistx.submit)",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                            help: "Saves using schema v1. Adapter receives mapped, validated data only."
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost"
                        }
                    ],
                    expect: {
                        shouldSee: [
                            "Analyze output shows mapped keys using schema v1",
                            "Submit output includes lastAdapterRequest and DB snapshot"
                        ]
                    }
                }
            ]
        },

        // ------------------------------------------------------------
        // STORY 2 — ADD A NEW FIELD (schema mismatch)
        // ------------------------------------------------------------
        {
            id: "add-field",
            title: "Story 2 — Add a new field (UI changes faster than schema)",
            description:
                "Simulate adding a new field in the UI. PersistX blocks it until the schema is updated.",
            steps: [
                {
                    id: "s2-setup",
                    title: "Start from v1 again",
                    hint:
                        "We start at schema v1. Now imagine product wants a new field: age.",
                    enter: {
                        formKey: "petProfile",
                        schemaRef: { kind: "snapshot", file: "schema.v1.json", versionLabel: "v1" },
                        payloadMode: "form",
                        initialFormValues: {
                            petName: "Fluffy",
                            petType: "Cat"
                        },
                        lock: {
                            formKey: true
                        }
                    },
                    actions: [
                        {
                            id: "add-age-ui",
                            label: "Simulate UI change: add field `age`",
                            kind: "applyUiPatch",
                            tone: "secondary",
                            help:
                                "In real life, this is you changing your frontend form. Schema is still v1.",
                            patch: {
                                op: "addField",
                                field: {
                                    key: "age",
                                    label: "Age",
                                    type: "number",
                                    placeholder: "3",
                                    note: "New UI field (not in schema v1)."
                                },
                                afterKey: "petType"
                            }
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost"
                        }
                    ],
                    explain: [
                        "Adding a new UI field is common.",
                        "But PersistX does NOT auto-accept new fields — the schema is the contract."
                    ]
                },
                {
                    id: "s2-break",
                    title: "Save now fails (schema mismatch)",
                    hint:
                        "Try saving with the new UI field. PersistX should block unexpected fields until you update schema.",
                    enter: {
                        // Keep schema v1 active. UI now includes age due to previous patch.
                        schemaRef: { kind: "snapshot", file: "schema.v1.json", versionLabel: "v1" },
                        lock: {
                            formKey: true
                        }
                    },
                    actions: [
                        {
                            id: "analyze",
                            label: "Analyze",
                            kind: "analyze",
                            tone: "secondary",
                            help: "See unknownInPayload include `age` when schema is v1."
                        },
                        {
                            id: "save",
                            label: "Save (expect error)",
                            kind: "submit",
                            tone: "primary",
                            expect: "error",
                            expectedErrorContains: "age",
                            help:
                                "PersistX should refuse or reject because v1 schema doesn't allow `age`."
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost"
                        }
                    ],
                    explain: [
                        "This failure is intentional — PersistX prevents silent schema drift.",
                        "Fix is to update the schema (no CLI needed for adding a new field)."
                    ],
                    expect: {
                        shouldSee: [
                            "Error mentions the new field (age) is not allowed or unknown",
                            "Analyze output shows unknownInPayload contains age"
                        ]
                    }
                },
                {
                    id: "s2-fix",
                    title: "Fix: update schema to v2 (add age)",
                    hint:
                        "Update the schema to include the new field. Now saving should succeed again.",
                    actions: [
                        {
                            id: "set-schema-v2",
                            label: "Update schema to v2 (allow `age`)",
                            kind: "setSchema",
                            tone: "secondary",
                            schemaRef: { kind: "snapshot", file: "schema.v2.add-age.json", versionLabel: "v2" },
                            help:
                                "In real life, you edit schema.json and bump version. No CLI is needed for adding fields."
                        },
                        {
                            id: "save",
                            label: "Save again (should succeed)",
                            kind: "submit",
                            tone: "primary",
                            expect: "success"
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost"
                        }
                    ],
                    explain: [
                        "Adding a new field is straightforward: bump schema version and include the field.",
                        "Old clients still work (they just don't send age). New clients can send age safely."
                    ]
                }
            ]
        },

        // ------------------------------------------------------------
        // STORY 3 — RENAME A FIELD (aliases + simulated CLI)
        // ------------------------------------------------------------
        {
            id: "rename-field",
            title: "Story 3 — Rename a field (aliases + CLI)",
            description:
                "Renames are dangerous. PersistX forces you to make them explicit using aliases (often via CLI diff).",
            steps: [
                {
                    id: "s3-setup",
                    title: "Start from schema v2 (petType exists)",
                    hint:
                        "We are at schema v2 which includes age. Now we want to rename petType → type.",
                    enter: {
                        formKey: "petProfile",
                        schemaRef: { kind: "snapshot", file: "schema.v2.add-age.json", versionLabel: "v2" },
                        payloadMode: "form",
                        initialFormValues: {
                            petName: "Fluffy",
                            petType: "Cat",
                            age: 3
                        },
                        lock: {
                            formKey: true
                        }
                    },
                    actions: [
                        {
                            id: "save",
                            label: "Save (works on v2)",
                            kind: "submit",
                            tone: "secondary",
                            expect: "success",
                            help: "Baseline check: before renaming, everything works."
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost"
                        }
                    ]
                },
                {
                    id: "s3-rename-ui",
                    title: "Simulate rename in UI: petType → type",
                    hint:
                        "Now your frontend changes the field name. Schema is still v2 (expects petType). Save should break.",
                    actions: [
                        {
                            id: "rename-ui",
                            label: "Rename UI field to `type`",
                            kind: "applyUiPatch",
                            tone: "secondary",
                            patch: {
                                op: "renameField",
                                from: "petType",
                                to: "type",
                                label: "Type"
                            },
                            help:
                                "In real life, you renamed the frontend field. Schema is not updated yet."
                        },
                        {
                            id: "analyze",
                            label: "Analyze",
                            kind: "analyze",
                            tone: "secondary"
                        },
                        {
                            id: "save",
                            label: "Save (expect error)",
                            kind: "submit",
                            tone: "primary",
                            expect: "error",
                            expectedErrorContains: "petType",
                            help:
                                "PersistX should reject because schema expects petType but UI now sends type."
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost"
                        }
                    ],
                    explain: [
                        "Renames are risky because old clients still send old keys.",
                        "PersistX does NOT guess renames. You must explicitly define aliases."
                    ]
                },
                {
                    id: "s3-cli",
                    title: "Run CLI diff (simulated) to add alias",
                    hint:
                        "In real life you run persistx diff to get rename suggestions, then apply aliases. We'll simulate that here.",
                    actions: [
                        {
                            id: "copy-cli",
                            label: "Copy CLI command",
                            kind: "copyCli",
                            tone: "ghost",
                            command: "persistx diff --file ./schema.json --apply",
                            help:
                                "This is the typical workflow when you rename fields: diff → review → apply aliases."
                        },
                        {
                            id: "apply-alias-schema",
                            label: "Apply alias (petType → type)",
                            kind: "setSchema",
                            tone: "secondary",
                            schemaRef: {
                                kind: "snapshot",
                                file: "schema.v3.rename-with-alias.json",
                                versionLabel: "v3"
                            },
                            help:
                                "Simulates CLI applying aliases into the schema. Now both old and new keys are supported."
                        },
                        {
                            id: "save",
                            label: "Save again (should succeed)",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                            help:
                                "With alias in schema v3, payload using `type` maps safely and saves."
                        },
                        {
                            id: "clear",
                            label: "Clear DB",
                            kind: "clearDb",
                            tone: "ghost"
                        },
                        {
                            id: "next",
                            label: "Finish",
                            kind: "next",
                            tone: "ghost"
                        }
                    ],
                    explain: [
                        "Aliases are the safety net for renames.",
                        "Old apps can keep sending petType, new apps can send type.",
                        "Storage uses canonical keys (the schema's key), avoiding mixed database shapes."
                    ],
                    expect: {
                        shouldSee: [
                            "Mapped output uses canonical key (`type`) with `petType` accepted via alias",
                            "Save succeeds after applying alias schema"
                        ]
                    }
                }
            ]
        }
    ]
};
