// packages/cli/src/migrate.ts
import type { PersistxFieldDefinition, PersistxFormDefinition } from "@persistx/core";
import fs from "node:fs";
import path from "node:path";

type SchemaFile = { raw: any; definitions: any[] };

export async function runMigrate(opts: {
    file: string;
    cwd?: string;

    form: string;
    from?: number;
    to?: number;

    input: string;
    out?: string;

    apply: boolean;
    keepUnknown: boolean;
    report: boolean;
}) {
    const base = opts.cwd ? path.resolve(process.cwd(), opts.cwd) : process.cwd();

    const schemaPath = path.resolve(base, opts.file);
    if (!fs.existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);

    const inputPath = path.resolve(base, opts.input);
    if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${inputPath}`);

    const schema = readSchemaFile(schemaPath);

    const defs = schema.definitions.filter((d: any) => d?.formKey === opts.form);
    if (defs.length === 0) throw new Error(`No definitions for formKey="${opts.form}"`);

    defs.sort((a: any, b: any) => a.version - b.version);

    const fromV = opts.from ?? (defs[0]?.version ?? 1);
    const toV = opts.to ?? (defs[defs.length - 1]?.version ?? fromV);

    const fromDef = defs.find((d: any) => d.version === fromV) as PersistxFormDefinition | undefined;
    const toDef = defs.find((d: any) => d.version === toV) as PersistxFormDefinition | undefined;

    if (!fromDef) throw new Error(`from version not found: ${opts.form}@${fromV}`);
    if (!toDef) throw new Error(`to version not found: ${opts.form}@${toV}`);

    const rawIn = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as unknown;
    const payloads = Array.isArray(rawIn) ? rawIn : [rawIn];

    const migrated = payloads.map((p, idx) =>
        migrateOne(p as Record<string, unknown>, fromDef, toDef, {
            keepUnknown: opts.keepUnknown,
            report: opts.report,
            index: idx,
            fromV,
            toV
        })
    );

    const outObj = Array.isArray(rawIn) ? migrated.map(x => x.out) : migrated[0]!.out;

    // preview
    if (!opts.apply) {
        console.log(`\n=== migrate ${opts.form}: v${fromV} -> v${toV} (preview) ===`);
        console.log(JSON.stringify(outObj, null, 2));
        console.log("\nTip: add --apply to write output");
        return;
    }

    const outPath = path.resolve(
        base,
        opts.out ? opts.out : `${opts.input}.migrated.json`
    );

    fs.writeFileSync(outPath, JSON.stringify(outObj, null, 2) + "\n", "utf-8");
    console.log(`\n✍️ wrote: ${outPath}`);
}

function migrateOne(
    payload: Record<string, unknown>,
    _fromDef: PersistxFormDefinition,
    toDef: PersistxFormDefinition,
    opts: { keepUnknown: boolean; report: boolean; index: number; fromV: number; toV: number }
) {
    // Build alias map for "to" fields: alias -> canonical
    const aliasToCanonical = new Map<string, string>();
    const canonicalSet = new Set<string>();

    for (const f of toDef.fields as PersistxFieldDefinition[]) {
        const canonical = String(f.key);
        canonicalSet.add(canonical);
        aliasToCanonical.set(canonical, canonical);

        const aliases = (f as any).aliases;
        if (Array.isArray(aliases)) {
            for (const a of aliases) aliasToCanonical.set(String(a), canonical);
        }
    }

    const out: Record<string, unknown> = {};
    const unknown: Record<string, unknown> = {};
    const remapped: Array<{ from: string; to: string }> = [];
    const dropped: string[] = [];

    for (const [k, v] of Object.entries(payload ?? {})) {
        const canonical = aliasToCanonical.get(k);
        if (!canonical) {
            if (opts.keepUnknown) unknown[k] = v;
            else dropped.push(k);
            continue;
        }
        if (canonical !== k) remapped.push({ from: k, to: canonical });
        out[canonical] = v;
    }

    if (opts.keepUnknown && Object.keys(unknown).length > 0) {
        out["_unknown"] = unknown;
    }

    if (opts.report) {
        // report to stderr so piping stdout stays clean
        const idxLabel = Array.isArray(payload) ? "" : `#${opts.index}`;
        console.error(
            [
                `\n[migrate report ${idxLabel}] v${opts.fromV} -> v${opts.toV}`,
                `  kept keys: ${Object.keys(out).filter(k => k !== "_unknown").length}`,
                `  remapped: ${remapped.length}`,
                `  dropped: ${dropped.length}`,
                remapped.length ? `  remapped list: ${remapped.map(r => `${r.from}->${r.to}`).join(", ")}` : "",
                dropped.length ? `  dropped list: ${dropped.join(", ")}` : ""
            ].filter(Boolean).join("\n")
        );
    }

    return { out, remapped, dropped };
}

function readSchemaFile(filePath: string): SchemaFile {
    const rawText = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(rawText);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (!Array.isArray(parsed.definitions)) throw new Error(`Schema must contain "definitions": [] (${filePath})`);
        return { raw: parsed, definitions: parsed.definitions };
    }

    if (Array.isArray(parsed)) return { raw: parsed, definitions: parsed };

    throw new Error(`Schema must be an array or { definitions: [] }: ${filePath}`);
}
