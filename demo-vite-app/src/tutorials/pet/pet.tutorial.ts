// src/tutorials/pet/pet.tutorial.ts

import type { Tutorial, UiField } from "../../tutorial/types";

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
        note: "In v1 the field is named petType. Later we'll rename it safely.",
    },
];

export const petTutorial: Tutorial = {
    id: "pet",
    title: "Pet Form",
    description: "Learn PersistX with a story: baseline save → add a field → rename a field (aliases + CLI).",

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
                    extraFieldShouldDrop: "lol",
                },
                "v1 payload (minimal)": {
                    petName: "Fluffy",
                    petType: "Cat",
                },
            },
        },
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
                    hint: "You have a pet form and a PersistX schema (v1). Save a valid payload and see what reaches the adapter.",
                    explain: [
                        "PersistX is a schema gatekeeper (contract).",
                        "When UI + schema match, PersistX stays out of your way.",
                        "Your app calls one line: persistx.submit(formKey, payload, { uid }).",
                    ],
                    enter: {
                        formKey: "petProfile",
                        schemaRef: { kind: "snapshot", file: "schema.v1.json", versionLabel: "v1" },
                        payloadMode: "form",
                        initialFormValues: { petName: "Fluffy", petType: "Cat" },
                        lock: { formKey: true },
                    },
                    actions: [
                        { id: "save", label: "Save (persistx.submit)", kind: "submit", tone: "primary", expect: "success" },
                        { id: "analyze", label: "Analyze (validate → normalize → map)", kind: "analyze", tone: "secondary" },
                        { id: "next", label: "Next", kind: "next", tone: "ghost" },
                    ],
                },
            ],
        },

        // ------------------------------------------------------------
        // STORY 2 — ADD FIELD (mismatch until schema update)
        // ------------------------------------------------------------
        {
            id: "add-field",
            title: "Story 2 — Add a new field (UI changes faster than schema)",
            description: "Add `age` in the UI. PersistX blocks it until schema is updated.",
            steps: [
                {
                    id: "s2-setup",
                    title: "Start from v1 again",
                    hint: "We start at schema v1. Now imagine product wants a new field: age.",
                    enter: {
                        formKey: "petProfile",
                        schemaRef: { kind: "snapshot", file: "schema.v1.json", versionLabel: "v1" },
                        payloadMode: "form",
                        initialFormValues: { petName: "Fluffy", petType: "Cat" },
                        lock: { formKey: true },
                    },
                    actions: [
                        {
                            id: "add-age-ui",
                            label: "Simulate UI change: add field `age`",
                            kind: "applyUiPatch",
                            tone: "secondary",
                            patch: {
                                op: "addField",
                                field: {
                                    key: "age",
                                    label: "Age",
                                    type: "number",
                                    placeholder: "3",
                                    note: "New UI field (not in schema v1).",
                                },
                                afterKey: "petType",
                            },
                        },
                        { id: "next", label: "Next", kind: "next", tone: "ghost" },
                    ],
                    explain: ["UI changes are common.", "PersistX does NOT auto-accept new fields — the schema is the contract."],
                },
                {
                    id: "s2-break",
                    title: "Save now fails (schema mismatch)",
                    hint: "UI now includes `age`, but schema is still v1. PersistX should block it.",
                    enter: {
                        schemaRef: { kind: "snapshot", file: "schema.v1.json", versionLabel: "v1" },
                        // IMPORTANT: ensure payload includes age so mismatch is guaranteed
                        initialFormValues: { age: 3 },
                        lock: { formKey: true },
                    },
                    actions: [
                        { id: "analyze", label: "Analyze", kind: "analyze", tone: "secondary" },
                        {
                            id: "save",
                            label: "Save (expect error)",
                            kind: "submit",
                            tone: "primary",
                            expect: "error",
                            expectedErrorContains: "age",
                        },
                        { id: "next", label: "Next", kind: "next", tone: "ghost" },
                    ],
                    explain: ["This failure is intentional — PersistX prevents silent schema drift.", "Fix is to update the schema."],
                },
                {
                    id: "s2-fix",
                    title: "Fix: update schema to v2 (add age)",
                    hint: "Update schema to include age. Saving should succeed again.",
                    actions: [
                        {
                            id: "set-schema-v2",
                            label: "Update schema to v2 (allow `age`)",
                            kind: "setSchema",
                            tone: "secondary",
                            schemaRef: { kind: "snapshot", file: "schema.v2.add-age.json", versionLabel: "v2" },
                        },
                        { id: "save", label: "Save again (should succeed)", kind: "submit", tone: "primary", expect: "success" },
                        { id: "next", label: "Next", kind: "next", tone: "ghost" },
                    ],
                    explain: [
                        "Adding a new field is straightforward: bump schema version and include the field.",
                        "Old clients still work; new clients can send age safely.",
                    ],
                },
            ],
        },

        // ------------------------------------------------------------
        // STORY 3 — RENAME (alias + CLI)
        // ------------------------------------------------------------
        {
            id: "rename-field",
            title: "Story 3 — Rename a field (aliases + CLI)",
            description: "Renames are dangerous. PersistX forces explicit aliases.",
            steps: [
                {
                    id: "s3-setup",
                    title: "Start from schema v2 (petType exists)",
                    hint: "We are at schema v2. Now we want to rename petType → type.",
                    enter: {
                        formKey: "petProfile",
                        schemaRef: { kind: "snapshot", file: "schema.v2.add-age.json", versionLabel: "v2" },
                        payloadMode: "form",
                        initialFormValues: { petName: "Fluffy", petType: "Cat", age: 3 },
                        lock: { formKey: true },
                    },
                    actions: [
                        { id: "save", label: "Save (works on v2)", kind: "submit", tone: "secondary", expect: "success" },
                        { id: "next", label: "Next", kind: "next", tone: "ghost" },
                    ],
                },
                {
                    id: "s3-rename-ui",
                    title: "Simulate rename in UI: petType → type",
                    hint: "Frontend renamed the field. Schema is still v2. Save should break.",
                    actions: [
                        {
                            id: "rename-ui",
                            label: "Rename UI field to `type`",
                            kind: "applyUiPatch",
                            tone: "secondary",
                            patch: { op: "renameField", from: "petType", to: "type", label: "Type" },
                        },
                        { id: "analyze", label: "Analyze", kind: "analyze", tone: "secondary" },
                        {
                            id: "save",
                            label: "Save (expect error)",
                            kind: "submit",
                            tone: "primary",
                            expect: "error",
                            expectedErrorContains: "petType",
                        },
                        { id: "next", label: "Next", kind: "next", tone: "ghost" },
                    ],
                    explain: [
                        "Renames are risky because old clients still send old keys.",
                        "PersistX does NOT guess renames. You must explicitly define aliases.",
                    ],
                },
                {
                    id: "s3-cli",
                    title: "Run CLI diff (simulated) to add alias",
                    hint: "We simulate `persistx diff --apply` by swapping to schema v3 (with aliases).",
                    actions: [
                        {
                            id: "copy-cli",
                            label: "Copy CLI command",
                            kind: "copyCli",
                            tone: "ghost",
                            command: "persistx diff --file ./schema.json --apply",
                        },
                        {
                            id: "apply-alias-schema",
                            label: "Apply alias (petType → type)",
                            kind: "setSchema",
                            tone: "secondary",
                            schemaRef: { kind: "snapshot", file: "schema.v3.rename-with-alias.json", versionLabel: "v3" },
                        },
                        { id: "save", label: "Save again (should succeed)", kind: "submit", tone: "primary", expect: "success" },
                        { id: "clear", label: "Clear DB", kind: "clearDb", tone: "ghost" },
                        { id: "next", label: "Finish", kind: "next", tone: "ghost" },
                    ],
                    explain: [
                        "Aliases are the safety net for renames.",
                        "Old apps can keep sending petType, new apps can send type.",
                        "Storage uses canonical keys, avoiding mixed database shapes.",
                    ],
                },
            ],
        },
    ],
};
