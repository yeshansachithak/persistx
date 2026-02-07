// src/tutorials/pet/pet.tutorial.ts

import type { Tutorial, UiField } from "../../tutorial/types";

/**
 * PersistX Interactive Tutorial — Pet Form
 *
 * DATA ONLY — no UI, no React.
 * Engine + Runner interpret this.
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

    schemaBaseUrl: "/schemas/pet",

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
            },
        },
    },

    stories: [
        // ============================================================
        // STORY 1 — BASELINE (v1)
        // ============================================================
        {
            id: "baseline",
            title: "Story 1 — Version 1 (happy path)",
            description: "UI and schema match. Saving should just work.",
            steps: [
                {
                    id: "s1-intro",
                    title: "Welcome",
                    hint:
                        "You have a pet form and a PersistX schema (v1). Save a valid payload and see what reaches the adapter.",
                    explain: [
                        "PersistX acts as a schema contract.",
                        "When UI and schema match, PersistX stays out of your way.",
                        "Your app calls one line: persistx.submit(formKey, payload, { uid }).",
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
                        lock: {
                            formKey: true,
                        },
                    },
                    actions: [
                        {
                            id: "analyze",
                            label: "Analyze",
                            kind: "analyze",
                            tone: "secondary",
                        },
                        {
                            id: "save",
                            label: "Save",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
            ],
        },

        // ============================================================
        // STORY 2 — ADD FIELD (schema mismatch)
        // ============================================================
        {
            id: "add-field",
            title: "Story 2 — UI changes faster than schema",
            description:
                "Simulate adding a new UI field. PersistX blocks it until the schema is updated.",
            steps: [
                {
                    id: "s2-setup",
                    title: "Start from schema v1",
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
                        lock: {
                            formKey: true,
                        },
                    },
                    actions: [
                        {
                            id: "add-age-ui",
                            label: "Add UI field: age",
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
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
                {
                    id: "s2-break",
                    title: "Save now fails",
                    hint:
                        "Try saving with the new UI field. PersistX should reject it.",
                    actions: [
                        {
                            id: "analyze",
                            label: "Analyze",
                            kind: "analyze",
                            tone: "secondary",
                        },
                        {
                            id: "save",
                            label: "Save (expect error)",
                            kind: "submit",
                            tone: "primary",
                            expect: "error",
                            expectedErrorContains: "age",
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
                {
                    id: "s2-fix",
                    title: "Fix: update schema to v2",
                    actions: [
                        {
                            id: "set-schema-v2",
                            label: "Update schema to v2",
                            kind: "setSchema",
                            tone: "secondary",
                            schemaRef: {
                                kind: "snapshot",
                                file: "schema.v2.add-age.json",
                                versionLabel: "v2",
                            },
                        },
                        {
                            id: "save",
                            label: "Save again",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
            ],
        },

        // ============================================================
        // STORY 3 — RENAME FIELD (aliases)
        // ============================================================
        {
            id: "rename-field",
            title: "Story 3 — Rename a field safely",
            description:
                "Renames require aliases. PersistX forces you to be explicit.",
            steps: [
                {
                    id: "s3-setup",
                    title: "Start from schema v2",
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
                        lock: {
                            formKey: true,
                        },
                    },
                    actions: [
                        {
                            id: "save",
                            label: "Save (baseline)",
                            kind: "submit",
                            tone: "secondary",
                            expect: "success",
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
                {
                    id: "s3-rename-ui",
                    title: "Rename UI field: petType → type",
                    actions: [
                        {
                            id: "rename-ui",
                            label: "Rename field in UI",
                            kind: "applyUiPatch",
                            tone: "secondary",
                            patch: {
                                op: "renameField",
                                from: "petType",
                                to: "type",
                                label: "Type",
                            },
                        },
                        {
                            id: "analyze",
                            label: "Analyze",
                            kind: "analyze",
                            tone: "secondary",
                        },
                        {
                            id: "save",
                            label: "Save (expect error)",
                            kind: "submit",
                            tone: "primary",
                            expect: "error",
                            // ✅ FIXED: schema v2 rejects "type", not missing petType
                            expectedErrorContains: "type",
                        },
                        {
                            id: "next",
                            label: "Next",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
                {
                    id: "s3-fix",
                    title: "Apply alias via schema v3",
                    actions: [
                        {
                            id: "set-schema-v3",
                            label: "Apply alias (schema v3)",
                            kind: "setSchema",
                            tone: "secondary",
                            schemaRef: {
                                kind: "snapshot",
                                file: "schema.v3.rename-with-alias.json",
                                versionLabel: "v3",
                            },
                        },
                        {
                            id: "save",
                            label: "Save again",
                            kind: "submit",
                            tone: "primary",
                            expect: "success",
                        },
                        {
                            id: "next",
                            label: "Finish",
                            kind: "next",
                            tone: "ghost",
                        },
                    ],
                },
            ],
        },
    ],
};
