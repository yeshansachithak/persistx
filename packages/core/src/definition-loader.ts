// packages/core/src/definition-loader.ts
import { readFileSync } from "node:fs";
import type { PersistxFormDefinition } from "./form-definition.js";
import { DefinitionInvalidError } from "./definition-errors.js";

export type DefinitionSource =
    | { kind: "memory"; definitions: PersistxFormDefinition[] }
    | { kind: "jsonFile"; path: string };

function basicValidateDefinition(def: PersistxFormDefinition) {
    if (!def.formKey || typeof def.formKey !== "string") throw new DefinitionInvalidError("formKey is required");
    if (!Number.isInteger(def.version) || def.version < 1) throw new DefinitionInvalidError("version must be an integer >= 1");
    if (!def.collection || typeof def.collection !== "string") throw new DefinitionInvalidError("collection is required");
    if (!def.docIdStrategy || typeof def.docIdStrategy !== "object") throw new DefinitionInvalidError("docIdStrategy is required");
    if (!def.writeMode) throw new DefinitionInvalidError("writeMode is required");
    if (!Array.isArray(def.fields)) throw new DefinitionInvalidError("fields must be an array");

    // ensure unique field keys
    const keys = new Set<string>();
    for (const f of def.fields) {
        if (!f.key || typeof f.key !== "string") throw new DefinitionInvalidError("field.key must be string", { field: f });
        if (keys.has(f.key)) throw new DefinitionInvalidError(`Duplicate field key "${f.key}"`, { formKey: def.formKey, version: def.version });
        keys.add(f.key);
    }
}

export function loadDefinitions(source: DefinitionSource): PersistxFormDefinition[] {
    if (source.kind === "memory") {
        for (const d of source.definitions) basicValidateDefinition(d);
        return source.definitions;
    }

    if (source.kind === "jsonFile") {
        const raw = readFileSync(source.path, "utf-8");
        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            throw new DefinitionInvalidError("JSON file must contain an array of form definitions", { path: source.path });
        }

        const defs = parsed as PersistxFormDefinition[];
        for (const d of defs) basicValidateDefinition(d);
        return defs;
    }

    // exhaustive
    throw new DefinitionInvalidError("Unknown definition source");
}
