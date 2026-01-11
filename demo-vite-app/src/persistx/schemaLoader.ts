// src/persistx/schemaLoader.ts

import type { SchemaRef } from "../tutorial/types";

export type SchemaSnapshot = {
    persistx: number;
    definitions: any[];
};

function isObject(x: unknown): x is Record<string, unknown> {
    return !!x && typeof x === "object" && !Array.isArray(x);
}

/**
 * Create a schema loader that loads schema snapshots from the Vite public folder.
 *
 * Example:
 *   const loadSchema = createSchemaLoader("/schemas/pet");
 *   const snap = await loadSchema({ kind: "snapshot", file: "schema.v1.json" });
 */
export function createSchemaLoader(schemaBaseUrl: string) {
    const base = schemaBaseUrl.replace(/\/+$/, ""); // trim trailing slashes

    return async function loadSchema(schemaRef: SchemaRef): Promise<SchemaSnapshot> {
        const url =
            schemaRef.kind === "snapshot"
                ? `${base}/${schemaRef.file}`
                : // Convention for version refs (optional):
                //   schema.v1.json, schema.v2.json, schema.v3.json
                `${base}/schema.v${schemaRef.version}.json`;

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to load schema snapshot: ${url} (HTTP ${res.status})`);
        }

        const json = (await res.json()) as unknown;

        if (!isObject(json)) {
            throw new Error(`Invalid schema JSON at ${url}: expected an object`);
        }

        if (!Array.isArray((json as any).definitions)) {
            throw new Error(`Invalid schema format at ${url}: expected { definitions: [...] }`);
        }

        return json as SchemaSnapshot;
    };
}
