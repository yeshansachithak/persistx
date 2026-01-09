// packages/cli/src/migrate.ts
import fs from "node:fs";
import path from "node:path";
import type { PersistxFormDefinition, PersistxFieldDefinition } from "@persistx/core";

type SchemaFile = { raw: any; definitions: any[] };

export async function runMigrate(opts: {
    file: string;
    form: string;
    from?: number;
    to?: number;
    input: string;
    out?: string;
    apply: boolean;
}) {
    const schemaPath = path.resolve(process.cwd(), opts.file);
    if (!fs.existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);

    const inputPath = path.resolve(process.cwd(), opts.input);
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

    const migrated = payloads.map((p) => migrateOne(p as Record<string, unknown>, fromDef, toDef));

    const outObj = Array.isArray(rawIn) ? migrated : migrated[0];

    // preview
    if (!opts.apply) {
        console.log(`\n=== migrate ${opts.form}: v${fromV} -> v${toV} (preview) ===`);
        console.log(JSON.stringify(outObj, null, 2));
        console.log("\nTip: add --apply to write output");
        return;
    }

    const outPath = path.resolve(
        process.cwd(),
        opts.out ? opts.out : `${opts.input}.migrated.json`
    );

    fs.writeFileSync(outPath, JSON.stringify(outObj, null, 2) + "\n", "utf-8");
    console.log(`\n✍️ wrote: ${outPath}`);
}

function migrateOne(payload: Record<string, unknown>, fromDef: PersistxFormDefinition, toDef: PersistxFormDefinition) {
    // Build alias map for "to" fields: alias -> canonical
    const aliasToCanonical = new Map<string, string>();

    for (const f of toDef.fields as PersistxFieldDefinition[]) {
        const canonical = String(f.key);
        aliasToCanonical.set(canonical, canonical);

        const aliases = (f as any).aliases;
        if (Array.isArray(aliases)) {
            for (const a of aliases) aliasToCanonical.set(String(a), canonical);
        }
    }

    // Only keep keys that exist in toDef (either canonical or alias)
    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(payload ?? {})) {
        const canonical = aliasToCanonical.get(k);
        if (!canonical) continue; // drop unknown on purpose (migration safety)
        out[canonical] = v;
    }

    // if you want: you can also move fromDef canonical keys -> toDef canonical via aliases
    // (already covered above because toDef includes old keys as aliases after diff/apply)

    return out;
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
