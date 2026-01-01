// packages/core/src/definition-loader.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { PersistxFormDefinition } from "./form-definition.js";
import { DefinitionInvalidError } from "./definition-errors.js";

export type DefinitionSource =
    | { kind: "memory"; definitions: PersistxFormDefinition[] }
    | { kind: "jsonFile"; path: string };

function basicValidateDefinition(def: PersistxFormDefinition) {
    if (!def.formKey || typeof def.formKey !== "string") {
        throw new DefinitionInvalidError("formKey is required");
    }
    if (!Number.isInteger(def.version) || def.version < 1) {
        throw new DefinitionInvalidError("version must be an integer >= 1");
    }
    if (!def.collection || typeof def.collection !== "string") {
        throw new DefinitionInvalidError("collection is required");
    }
    if (!def.docIdStrategy || typeof def.docIdStrategy !== "object") {
        throw new DefinitionInvalidError("docIdStrategy is required");
    }
    if (!def.writeMode) {
        throw new DefinitionInvalidError("writeMode is required");
    }
    if (!Array.isArray(def.fields)) {
        throw new DefinitionInvalidError("fields must be an array");
    }

    // ensure unique incoming keys across field.key + field.aliases (per definition)
    const incomingKeys = new Set<string>();

    for (const f of def.fields) {
        if (!f.key || typeof f.key !== "string") {
            throw new DefinitionInvalidError("field.key must be string", { field: f });
        }

        if (incomingKeys.has(f.key)) {
            throw new DefinitionInvalidError(`Duplicate field key "${f.key}"`, {
                formKey: def.formKey,
                version: def.version
            });
        }
        incomingKeys.add(f.key);

        // validate aliases
        if (f.aliases !== undefined) {
            if (!Array.isArray(f.aliases)) {
                throw new DefinitionInvalidError(`field.aliases must be an array of strings`, {
                    formKey: def.formKey,
                    version: def.version,
                    field: f.key
                });
            }

            for (const a of f.aliases) {
                if (typeof a !== "string" || !a.trim()) {
                    throw new DefinitionInvalidError(`field.aliases must contain non-empty strings`, {
                        formKey: def.formKey,
                        version: def.version,
                        field: f.key,
                        alias: a
                    });
                }

                if (incomingKeys.has(a)) {
                    throw new DefinitionInvalidError(`Duplicate field alias "${a}" (conflicts within definition)`, {
                        formKey: def.formKey,
                        version: def.version,
                        field: f.key
                    });
                }

                incomingKeys.add(a);
            }
        }
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
            throw new DefinitionInvalidError("JSON file must contain an array of form definitions", {
                path: source.path
            });
        }

        const defs = parsed as PersistxFormDefinition[];
        for (const d of defs) basicValidateDefinition(d);
        return defs;
    }

    throw new DefinitionInvalidError("Unknown definition source");
}

/**
 * Load all *.json files under a directory, flattening any arrays of definitions.
 * - Skips non-json files
 * - Throws if JSON is invalid or not an array
 * - Validates each definition
 */
export function loadDefinitionsFromDir(dirPath: string): PersistxFormDefinition[] {
    const st = statSync(dirPath);
    if (!st.isDirectory()) {
        throw new DefinitionInvalidError("Definitions path is not a directory", { dirPath });
    }

    const files = readdirSync(dirPath)
        .filter((f) => f.toLowerCase().endsWith(".json"))
        .map((f) => path.join(dirPath, f));

    const all: PersistxFormDefinition[] = [];

    for (const filePath of files) {
        const raw = readFileSync(filePath, "utf-8");
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch (e: any) {
            throw new DefinitionInvalidError("Invalid JSON in definitions file", {
                filePath,
                error: e?.message ?? String(e)
            });
        }

        if (!Array.isArray(parsed)) {
            throw new DefinitionInvalidError("Definitions JSON must be an array", { filePath });
        }

        const defs = parsed as PersistxFormDefinition[];
        for (const d of defs) basicValidateDefinition(d);
        all.push(...defs);
    }

    return all;
}
