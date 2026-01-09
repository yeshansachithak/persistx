// packages/cli/src/diff.ts
import type { PersistxFieldDefinition, PersistxFormDefinition } from "@persistx/core";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";



type LoadedDef = {
    filePath: string;
    defIndexInFile: number;
    def: PersistxFormDefinition;
};

type SchemaFile = {
    raw: any;
    definitions: any[];
};

export async function runDiff(opts: {
    file: string;
    cwd?: string;

    apply: boolean;
    yes: boolean;
    forceYes: boolean;
    minScore: number;
    strict: boolean;

    form?: string;
    from?: number;
    to?: number;
}) {
    const base = opts.cwd ? path.resolve(process.cwd(), opts.cwd) : process.cwd();
    const fileAbs = path.resolve(base, opts.file);

    if (!fs.existsSync(fileAbs)) throw new Error(`Schema file not found: ${fileAbs}`);

    const schema = readSchemaFile(fileAbs);
    const loaded = loadDefinitionsWithSource(fileAbs, schema.definitions);

    const byForm = new Map<string, LoadedDef[]>();
    for (const item of loaded) {
        if (opts.form && item.def.formKey !== opts.form) continue;
        const arr = byForm.get(item.def.formKey) ?? [];
        arr.push(item);
        byForm.set(item.def.formKey, arr);
    }

    if (byForm.size === 0) {
        console.log("No definitions found (or formKey filter did not match).");
        return;
    }

    const rl = opts.yes ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
    let didWrite = false;

    for (const [formKey, defs] of byForm.entries()) {
        defs.sort((a, b) => a.def.version - b.def.version);

        const fromV = opts.from ?? (defs.length >= 2 ? defs[defs.length - 2]!.def.version : undefined);
        const toV = opts.to ?? defs[defs.length - 1]!.def.version;

        if (!fromV) {
            console.log(`\n[${formKey}] Skipping (need at least 2 versions, or pass --from/--to).`);
            continue;
        }

        const fromDef = defs.find((d) => d.def.version === fromV);
        const toDef = defs.find((d) => d.def.version === toV);

        if (!fromDef || !toDef) {
            console.log(`\n[${formKey}] Skipping (version not found). from=${fromV} to=${toV}`);
            continue;
        }

        console.log(`\n=== ${formKey}: v${fromV} -> v${toV} ===`);

        const suggestions = suggestRenames(fromDef.def, toDef.def, {
            minScore: opts.minScore,
            strict: opts.strict
        });

        if (suggestions.length === 0) {
            console.log("No rename suggestions found.");
            continue;
        }

        for (const s of suggestions) {
            const hardBlock =
                s.ambiguous ||
                (opts.strict && isGenericKey(s.toKey) && s.score < 0.9);

            // In interactive mode: defaultYes only when it is "safe"
            const defaultYes = !hardBlock && s.score >= 0.88;

            const msg = hardBlock
                ? `Map "${s.fromKey}" -> "${s.toKey}" ? (score=${s.score.toFixed(2)}${s.ambiguous ? ", ambiguous" : ""}${isGenericKey(s.toKey) ? ", generic-target" : ""})`
                : `Map "${s.fromKey}" -> "${s.toKey}" ? (score=${s.score.toFixed(2)})`;

            // In --yes mode: accept only safe unless forceYes
            const accept = opts.yes
                ? (opts.forceYes ? true : !hardBlock)
                : await askYesNo(rl!, msg, defaultYes);

            if (!accept) continue;

            console.log(`  ✅ accepted: ${s.fromKey} -> ${s.toKey}`);

            if (opts.apply) {
                applyAliasMapping(schema.definitions, toDef.def.formKey, toDef.def.version, s.toKey, s.fromKey);
                didWrite = true;
            }
        }
    }

    if (rl) rl.close();

    if (opts.apply) {
        if (!didWrite) console.log("\nNothing to write.");
        else {
            writeSchemaFile(fileAbs, schema);
            console.log(`\n✍️  wrote: ${fileAbs}`);
        }
    }

    console.log("\nDone.");
}

function readSchemaFile(filePath: string): SchemaFile {
    const rawText = fs.readFileSync(filePath, "utf-8");
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawText);
    } catch (e: any) {
        throw new Error(`Invalid JSON: ${filePath} (${e?.message ?? String(e)})`);
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as any;
        if (!Array.isArray(obj.definitions)) throw new Error(`Schema must contain "definitions": [] (${filePath})`);
        return { raw: obj, definitions: obj.definitions };
    }

    if (Array.isArray(parsed)) return { raw: parsed, definitions: parsed };

    throw new Error(`Schema must be an array or { definitions: [] }: ${filePath}`);
}

function writeSchemaFile(filePath: string, schema: SchemaFile) {
    const outJson = Array.isArray(schema.raw)
        ? schema.definitions
        : { ...schema.raw, definitions: schema.definitions };

    fs.writeFileSync(filePath, JSON.stringify(outJson, null, 2) + "\n", "utf-8");
}

function loadDefinitionsWithSource(filePath: string, definitions: any[]): LoadedDef[] {
    const out: LoadedDef[] = [];
    for (let i = 0; i < definitions.length; i++) {
        const def = definitions[i] as PersistxFormDefinition;
        if (!def?.formKey || !def?.version || !def?.fields) continue;
        out.push({ filePath, defIndexInFile: i, def });
    }
    return out;
}

type RenameSuggestion = { fromKey: string; toKey: string; score: number; ambiguous: boolean };

function suggestRenames(
    fromDef: PersistxFormDefinition,
    toDef: PersistxFormDefinition,
    cfg: { minScore: number; strict: boolean }
): RenameSuggestion[] {
    const fromKeys = new Set<string>(fromDef.fields.map((f: PersistxFieldDefinition) => String(f.key)));
    const toKeys = new Set<string>(toDef.fields.map((f: PersistxFieldDefinition) => String(f.key)));

    const removed = [...fromKeys].filter((k) => !toKeys.has(k));
    const added = [...toKeys].filter((k) => !fromKeys.has(k));

    if (removed.length === 0 || added.length === 0) return [];

    const all: RenameSuggestion[] = [];

    for (const r of removed) {
        const ranked = added
            .map((a) => ({ a, score: similarityScore(r, a) }))
            .sort((x, y) => y.score - x.score);

        const best = ranked[0];
        if (!best) continue;

        const second = ranked[1];
        const ambiguous = !!second && (best.score - second.score) < 0.06 && best.score < 0.95;

        // Strict mode: require higher minimum when mapping into generic keys
        const minScore = (cfg.strict && isGenericKey(best.a)) ? Math.max(cfg.minScore, 0.78) : cfg.minScore;

        if (best.score >= minScore) {
            all.push({ fromKey: r, toKey: best.a, score: best.score, ambiguous });
        }
    }

    all.sort((x, y) => y.score - x.score);

    // Dedupe target key
    const usedTo = new Set<string>();
    const final: RenameSuggestion[] = [];
    for (const s of all) {
        if (usedTo.has(s.toKey)) continue;
        usedTo.add(s.toKey);
        final.push(s);
    }

    return final;
}

function isGenericKey(k: string) {
    const x = String(k).toLowerCase();
    return x === "id" || x === "uid" || x === "type" || x === "key" || x === "value" || x === "name";
}

function similarityScore(a: string, b: string): number {
    const na = normalizeKey(a);
    const nb = normalizeKey(b);

    if (na === nb) return 1.0;

    // (1) base edit similarity
    const d = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length) || 1;
    const edit = 1 - d / maxLen;

    // (2) token overlap (camel/snake/kebab split)
    const ta = new Set(tokenize(a));
    const tb = new Set(tokenize(b));
    const token = jaccard(ta, tb);

    // (3) contains/prefix bonuses
    const contains = na.includes(nb) || nb.includes(na) ? 0.08 : 0;
    const prefix = na.startsWith(nb) || nb.startsWith(na) ? 0.06 : 0;

    // (4) short-key penalty
    const shortPenalty = Math.min(0.18, shortKeyPenalty(na, nb, ta, tb));

    const score = (0.62 * edit) + (0.32 * token) + contains + prefix - shortPenalty;
    return clamp(score, 0, 1);
}

function tokenize(s: string): string[] {
    const raw = String(s).trim();
    const camel = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    const parts = camel.split(/[^a-zA-Z0-9]+/g).filter(Boolean);
    return parts.map((p) => p.toLowerCase());
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}

function shortKeyPenalty(na: string, nb: string, ta: Set<string>, tb: Set<string>): number {
    const shortSet = new Set(["id", "uid", "type", "name", "key", "value"]);
    const isShortTarget = shortSet.has(nb) || nb.length <= 3;
    if (!isShortTarget) return 0;

    // if tokens overlap, don’t punish too much
    const tokenOverlap = [...ta].some((t) => tb.has(t));
    if (tokenOverlap) return 0.04;

    // mapping to generic targets should not become “high confidence”
    return 0.14;
}

function normalizeKey(s: string): string {
    return String(s)
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]/g, "")
        .replace(/[^a-z0-9.]/g, "");
}

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    let prev = new Uint32Array(n + 1);
    let cur = new Uint32Array(n + 1);

    for (let j = 0; j <= n; j++) prev[j] = j;

    const get = (arr: Uint32Array, idx: number) => arr[idx] ?? 0;

    for (let i = 1; i <= m; i++) {
        cur[0] = i;
        const ai = a.charCodeAt(i - 1);

        for (let j = 1; j <= n; j++) {
            const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;

            const del = get(prev, j) + 1;
            const ins = get(cur, j - 1) + 1;
            const sub = get(prev, j - 1) + cost;

            cur[j] = Math.min(del, ins, sub);
        }

        const tmp = prev;
        prev = cur;
        cur = tmp;
    }

    return get(prev, n);
}

function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(max, x));
}

async function askYesNo(rl: readline.Interface, question: string, defaultYes: boolean): Promise<boolean> {
    const suffix = defaultYes ? " [Y/n]" : " [y/N]";
    const ans = await new Promise<string>((resolve) => rl.question(question + suffix + " ", resolve));
    const t = ans.trim().toLowerCase();
    if (!t) return defaultYes;
    if (t === "y" || t === "yes") return true;
    if (t === "n" || t === "no") return false;
    return defaultYes;
}

function applyAliasMapping(definitions: any[], formKey: string, version: number, toKey: string, fromKey: string) {
    const defObj = definitions.find((d: any) => d?.formKey === formKey && d?.version === version);
    if (!defObj) throw new Error(`Cannot apply mapping: target def not found for ${formKey}@${version}`);

    const field = (defObj.fields ?? []).find((f: any) => f?.key === toKey);
    if (!field) throw new Error(`Cannot apply mapping: field "${toKey}" not found in ${formKey}@${version}`);

    const aliases: string[] = Array.isArray(field.aliases) ? field.aliases : [];
    if (!aliases.includes(fromKey)) aliases.push(fromKey);
    field.aliases = aliases;
}
