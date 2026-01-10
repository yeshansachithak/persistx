// packages/core/src/normalize.ts
export type PersistxNormalizeOptions = {
    trimStrings?: boolean;           // default true
    coerceDatesToISO?: boolean;      // default true
    dropUndefined?: boolean;         // default true
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeValue(v: unknown, opts: Required<PersistxNormalizeOptions>): unknown {
    if (v === undefined) return undefined;

    if (v instanceof Date) {
        return opts.coerceDatesToISO ? v.toISOString() : v;
    }

    if (typeof v === "string") {
        const s = opts.trimStrings ? v.trim() : v;

        // extremely conservative date string detection
        if (opts.coerceDatesToISO) {
            // ISO-like or common date strings; if Date can parse it reliably, convert to ISO
            const d = new Date(s);
            if (!Number.isNaN(d.getTime()) && (s.includes("-") || s.includes("/") || s.endsWith("Z"))) {
                // only convert if it looks date-ish; avoids converting normal text
                if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) || s.includes("T")) {
                    return d.toISOString();
                }
            }
        }

        return s;
    }

    if (Array.isArray(v)) {
        return v.map((x) => normalizeValue(x, opts));
    }

    if (isPlainObject(v)) {
        const out: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v)) {
            const nv = normalizeValue(val, opts);
            if (nv === undefined && opts.dropUndefined) continue;
            out[k] = nv;
        }
        return out;
    }

    return v;
}

export function normalizePayload(
    payload: Record<string, unknown>,
    options: PersistxNormalizeOptions = {}
): Record<string, unknown> {
    const opts: Required<PersistxNormalizeOptions> = {
        trimStrings: options.trimStrings ?? true,
        coerceDatesToISO: options.coerceDatesToISO ?? true,
        dropUndefined: options.dropUndefined ?? true
    };

    const normalized = normalizeValue(payload, opts);
    return (normalized && typeof normalized === "object" && !Array.isArray(normalized))
        ? (normalized as Record<string, unknown>)
        : {};
}
