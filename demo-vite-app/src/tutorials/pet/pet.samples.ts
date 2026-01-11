// src/tutorials/pet/pet.samples.ts

/**
 * Pet tutorial sample payloads and default values.
 *
 * Keep this file "dumb": plain objects only (no React).
 * The tutorial runner can use these for:
 *  - payload pickers
 *  - reset buttons
 *  - step initialization
 */

export const petSamples = {
    v1LegacyWithUnknown: {
        petName: "Fluffy",
        petType: "Cat",
        age: 3, // intentionally present to demonstrate schema mismatch (v1 doesn't allow age)
        extraFieldShouldDrop: "lol"
    },

    v1Minimal: {
        petName: "Fluffy",
        petType: "Cat"
    },

    v2Canonical: {
        petName: "Fluffy",
        petType: "Cat",
        age: 3
    },

    v3Renamed: {
        petName: "Fluffy",
        type: "Cat",
        age: 3
    }
} as const;

export type PetSampleKey = keyof typeof petSamples;

/**
 * Default form values (for "form mode" inputs).
 * These are UI values, not necessarily schema-valid in every step.
 */
export const petDefaultFormValues = {
    petName: "Fluffy",
    petType: "Cat",
    age: 3
} as const;
