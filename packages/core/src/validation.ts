// packages/core/src/validation.ts
import type { PersistxFieldDefinition, PersistxFormDefinition } from "./form-definition.js";

function isTypeOk(type: string, value: unknown) {
    switch (type) {
        case "string": return typeof value === "string";
        case "number": return typeof value === "number" && Number.isFinite(value);
        case "boolean": return typeof value === "boolean";
        case "date": return typeof value === "string" || value instanceof Date; // keep flexible for now
        case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
        case "array": return Array.isArray(value);
        default: return true;
    }
}

export type PersistxValidationError = {
    field: string;
    message: string;
};

export function validatePayload(def: PersistxFormDefinition, payload: Record<string, unknown>) {
    const errors: PersistxValidationError[] = [];

    for (const f of def.fields) {
        const v = payload[f.key];

        const isMissing = v === undefined || v === null || (v === "" && !f.nullable);

        // required
        if (f.rules?.some(r => r.kind === "required") && isMissing) {
            errors.push({ field: f.key, message: "Required" });
            continue;
        }

        if (v === undefined || v === null) continue;

        // type check
        if (!isTypeOk(f.type, v)) {
            errors.push({ field: f.key, message: `Expected ${f.type}` });
            continue;
        }

        // simple rules
        for (const rule of f.rules ?? []) {
            if (rule.kind === "min" && typeof v === "number" && v < rule.value) {
                errors.push({ field: f.key, message: rule.message ?? `Min ${rule.value}` });
            }
            if (rule.kind === "max" && typeof v === "number" && v > rule.value) {
                errors.push({ field: f.key, message: rule.message ?? `Max ${rule.value}` });
            }
            if (rule.kind === "regex" && typeof v === "string") {
                const re = new RegExp(rule.value);
                if (!re.test(v)) errors.push({ field: f.key, message: rule.message ?? "Invalid format" });
            }
        }
    }

    return { ok: errors.length === 0, errors };
}
