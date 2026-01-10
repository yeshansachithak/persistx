// packages/core/src/mapper.ts
import type { PersistxFormDefinition, PersistxFieldDefinition } from "./form-definition.js";
import { UnknownFieldError } from "./definition-errors.js";

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

function resolveFieldValue(field: PersistxFieldDefinition, payload: Record<string, unknown>) {
    const direct = payload[field.key];
    if (direct !== undefined) return direct;

    for (const a of field.aliases ?? []) {
        const v = payload[a];
        if (v !== undefined) return v;
    }
    return undefined;
}

export function mapPayload(def: PersistxFormDefinition, payload: Record<string, unknown>) {
    const out: Record<string, unknown> = {};

    const allowedKeys = new Set<string>();
    for (const f of def.fields) {
        allowedKeys.add(f.key);
        for (const a of f.aliases ?? []) allowedKeys.add(a);
    }

    if (def.allowUnknownFields === false) {
        for (const k of Object.keys(payload)) {
            if (!allowedKeys.has(k)) {
                throw new UnknownFieldError(k, def.formKey, def.version);
            }
        }
    }

    for (const field of def.fields) {
        if (field.ignore) continue;

        const value = resolveFieldValue(field, payload);
        if (value === undefined) continue;

        const path = field.path ?? field.key;
        setDotPath(out, path, value);
    }

    return out;
}
