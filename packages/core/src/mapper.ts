// packages/core/src/mapper.ts
import type { PersistxFormDefinition } from "./form-definition.js";

function setDotPath(target: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split(".");
    let cur: Record<string, unknown> = target;

    for (let i = 0; i < parts.length; i++) {
        const p = parts[i]!;
        const isLast = i === parts.length - 1;

        if (isLast) {
            cur[p] = value;
        } else {
            const existing = cur[p];
            if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
                cur = existing as Record<string, unknown>;
            } else {
                const next: Record<string, unknown> = {};
                cur[p] = next;
                cur = next;
            }
        }
    }
}

export function mapPayload(def: PersistxFormDefinition, payload: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    const allowedKeys = new Set(def.fields.map(f => f.key));

    if (def.allowUnknownFields === false) {
        for (const k of Object.keys(payload)) {
            if (!allowedKeys.has(k)) {
                throw new Error(`Unknown field "${k}" for ${def.formKey}@${def.version}`);
            }
        }
    }

    for (const field of def.fields) {
        if (field.ignore) continue;

        const value = payload[field.key];
        if (value === undefined) continue;

        const path = field.path ?? field.key;
        setDotPath(out, path, value);
    }

    return out;
}
