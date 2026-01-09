// demo-vite/src/persistxClient.ts
import {
    createPersistx,
    createInMemoryRegistry,
    validatePayload,
    normalizePayload,
    mapPayload
} from "@persistx/core";

import type { DemoAdapter } from "./persistx-demo-adapter";
import { createMemoryAdapter } from "./persistx-demo-adapter";

type SchemaFile = { persistx: number; definitions: any[] };

export async function createDemoPersistx() {
    const res = await fetch("/schema.json");
    if (!res.ok) throw new Error("Missing /schema.json in public/");

    const schema = (await res.json()) as SchemaFile;
    if (!schema?.definitions || !Array.isArray(schema.definitions)) {
        throw new Error("Invalid schema.json format. Expected { definitions: [...] }");
    }

    const registry = createInMemoryRegistry(schema.definitions);
    const adapter: DemoAdapter = createMemoryAdapter();

    const persistx = createPersistx({ adapter, registry });

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
        const { def, version } = resolveDef(formKey, schemaVersion);

        const validation = validatePayload(def, payload);
        const normalized = normalizePayload(payload, { dropUndefined: true, trimStrings: true });
        const mapped = mapPayload(def, normalized);

        const allowed = allowedKeys(def);
        const unknownInPayload = Object.keys(payload).filter((k) => !allowed.has(k));

        return { def, version, validation, normalized, mapped, unknownInPayload };
    }

    return { persistx, registry, adapter, analyze };
}
