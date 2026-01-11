// src/persistx/persistxClient.ts

import {
    createPersistx,
    createInMemoryRegistry,
    validatePayload,
    normalizePayload,
    mapPayload,
} from "@persistx/core";

import type { DemoAdapter } from "./demoAdapter";
import { createMemoryAdapter } from "./demoAdapter";
import type { SchemaSnapshot } from "./schemaLoader";

export type PersistxRuntime = {
    persistx: {
        submit: (
            formKey: string,
            payload: Record<string, unknown>,
            opts?: { uid?: string; schemaVersion?: number; mode?: "create" | "update" | "upsert" }
        ) => Promise<any>;
    };
    analyze: (formKey: string, payload: Record<string, unknown>, schemaVersion?: number) => any;
    adapter: DemoAdapter;

    /**
     * IMPORTANT: because your schema snapshots are single-version files,
     * we must rebuild the registry + persistx when schema changes.
     */
    setSchemaSnapshot: (snapshot: SchemaSnapshot) => void;

    /**
     * Useful for debugging / UI if needed later.
     */
    getRegistry: () => any;
};

function isObjectRecord(x: unknown): x is Record<string, unknown> {
    return !!x && typeof x === "object" && !Array.isArray(x);
}

export function createPersistxRuntime(initialSchema: SchemaSnapshot): PersistxRuntime {
    const adapter: DemoAdapter = createMemoryAdapter();

    let registry = createInMemoryRegistry(initialSchema.definitions);
    let persistx = createPersistx({ adapter, registry });

    function resolveDef(formKey: string, schemaVersion?: number) {
        const v = schemaVersion ?? registry.getLatestVersion(formKey);
        if (!v) throw new Error(`No versions found for formKey="${formKey}"`);
        const def = registry.get(formKey, v);
        if (!def) throw new Error(`Definition not found for ${formKey}@v${v}`);
        return { def, version: v };
    }

    function allowedKeys(def: any) {
        const s = new Set<string>();
        for (const f of def.fields ?? []) {
            if (f?.key) s.add(String(f.key));
            for (const a of f?.aliases ?? []) s.add(String(a));
        }
        return s;
    }

    function analyze(formKey: string, payload: Record<string, unknown>, schemaVersion?: number) {
        if (!isObjectRecord(payload)) throw new Error("Payload must be a JSON object");

        const { def, version } = resolveDef(formKey, schemaVersion);

        const validation = validatePayload(def, payload);
        const normalized = normalizePayload(payload, { dropUndefined: true, trimStrings: true });
        const mapped = mapPayload(def, normalized);

        const allowed = allowedKeys(def);
        const unknownInPayload = Object.keys(payload).filter((k) => !allowed.has(k));

        return { def, version, validation, normalized, mapped, unknownInPayload };
    }

    function setSchemaSnapshot(snapshot: SchemaSnapshot) {
        if (!snapshot?.definitions || !Array.isArray(snapshot.definitions)) {
            throw new Error("Invalid schema snapshot (expected { definitions: [] })");
        }
        registry = createInMemoryRegistry(snapshot.definitions);
        persistx = createPersistx({ adapter, registry });
    }

    return {
        persistx: {
            submit: (formKey, payload, opts) => persistx.submit(formKey as any, payload as any, opts as any),
        },
        analyze,
        adapter,
        setSchemaSnapshot,
        getRegistry: () => registry,
    };
}
