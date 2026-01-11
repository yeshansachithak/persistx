// src/persistx/schemaLoader.ts

import type { SchemaRef } from "../tutorial/types";

export type SchemaSnapshot = {
    persistx: number;
    definitions: any[];
};

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
                : // For "version", we use a simple convention:
                //   schema.v1.json, schema.v2.json, schema.v3.json
                // If you don't want this convention, keep using snapshot refs only.
                `${base}/schema.v${schemaRef.version}.json`;

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to load schema snapshot: ${url} (HTTP ${res.status})`);
        }

        const json = (await res.json()) as SchemaSnapshot;

        if (!json || typeof json !== "object") {
            throw new Error(`Invalid schema JSON at ${url}`);
        }
        if (!Array.isArray((json as any).definitions)) {
            throw new Error(`Invalid schema format at ${url}: expected { definitions: [...] }`);
        }

        return json;
    };
}
