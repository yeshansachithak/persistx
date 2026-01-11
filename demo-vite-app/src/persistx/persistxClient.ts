// src/persistx/persistxClient.ts

import {
    createPersistx,
    createInMemoryRegistry,
    validatePayload,
    normalizePayload,
    mapPayload
} from "@persistx/core";

import type { PersistxEngine } from "@persistx/core";
import type { SchemaSnapshot } from "./schemaLoader";
import { createMemoryAdapter, type DemoAdapter } from "./demoAdapter";

/**
 * This file wires PersistX for the interactive tutorial.
 *
 * IMPORTANT:
 * - This is NOT magic glue
 * - This is exactly what a real app would do at runtime
 * - The only "demo-only" part is the in-memory adapter
 */

export type PersistxRuntime = {
    persistx: PersistxEngine;
    adapter: DemoAdapter;

    /**
     * Expose internal pipeline steps for teaching purposes.
     * Real apps usually don't call these directly.
     */
    analyze: (
        formKey: string,
        payload: Record<string, unknown>,
        schemaVersion?: number
    ) => {
        def: any;
        version: number;
        validation: ReturnType<typeof validatePayload>;
        normalized: Record<string, unknown>;
        mapped: Record<string, unknown>;
        unknownInPayload: string[];
    };
};

/**
 * Create a PersistX runtime from a loaded schema snapshot.
 * Called whenever the tutorial swaps schema versions.
 */
export function createPersistxRuntime(schema: SchemaSnapshot): PersistxRuntime {
    const registry = createInMemoryRegistry(schema.definitions);
    const adapter = createMemoryAdapter();

    const persistx = createPersistx({
        adapter,
        registry,
        normalize: {
            dropUndefined: true,
            trimStrings: true
        }
    });

    function analyze(
        formKey: string,
        payload: Record<string, unknown>,
        schemaVersion?: number
    ) {
        const version = schemaVersion ?? registry.getLatestVersion(formKey);
        if (!version) throw new Error(`No schema versions for formKey="${formKey}"`);

        const def = registry.get(formKey, version);
        if (!def) throw new Error(`Definition not found: ${formKey}@v${version}`);

        const validation = validatePayload(def, payload);
        const normalized = normalizePayload(payload, {
            dropUndefined: true,
            trimStrings: true
        });
        const mapped = mapPayload(def, normalized);

        const allowed = new Set<string>();
        for (const f of def.fields ?? []) {
            allowed.add(f.key);
            for (const a of f.aliases ?? []) allowed.add(a);
        }

        const unknownInPayload = Object.keys(payload).filter((k) => !allowed.has(k));

        return {
            def,
            version,
            validation,
            normalized,
            mapped,
            unknownInPayload
        };
    }

    return {
        persistx,
        adapter,
        analyze
    };
}
