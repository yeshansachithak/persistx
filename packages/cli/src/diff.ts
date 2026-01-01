// packages/cli/src/diff.ts
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { PersistxFormDefinition } from "@persistx/core";

type LoadedDef = {
    filePath: string;
    defIndexInFile: number; // index in JSON array
    def: PersistxFormDefinition;
};

export async function runDiff(opts: {
    dir: string;
    apply: boolean;
    yes: boolean;
    form?: string;
    from?: number;
    to?: number;
}) {
    const dirAbs = path.resolve(process.cwd(), opts.dir);
    if (!fs.existsSync(dirAbs)) throw new Error(`Definitions dir not found: ${dirAbs}`);

    const loaded = loadDefinitionsWithSource(dirAbs);

    // Group by formKey
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

    const rl = opts.yes
        ? null
        : readline.createInterface({ input: process.stdin, output: process.stdout });

    const pendingWrites = new Map<string, unknown>(); // filePath -> parsed json array mutated

    for (const [formKey, defs] of byForm.entries()) {
        defs.sort((a, b) => a.def.version - b.def.version);

        const fromV = opts.from ?? (defs.length >= 2 ? defs[defs.length - 2]!.def.version : undefined);
        const toV = opts.to ?? defs[defs.length - 1]!.def.version;

        if (!fromV) {
            console.log(`\n[${formKey}] Skipping (need at least 2 versions, or pass --from/--to).`);
            continue;
        }

        const fromDef = defs.find(d => d.def.version === fromV);
        const toDef = defs.find(d => d.def.version === toV);

        if (!fromDef || !toDef) {
            console.log(`\n[${formKey}] Skipping (version not found). from=${fromV} to=${toV}`);
            continue;
        }

        console.log(`\n=== ${formKey}: v${fromV} -> v${toV} ===`);
        const suggestions = suggestRenames(fromDef.def, toDef.def);

        if (suggestions.length === 0) {
            console.log("No rename suggestions found.");
            continue;
        }

        // Load target file JSON (only if we may apply)
        let toFileJson: any[] | null = null;
        if (opts.apply) {
            toFileJson = (pendingWrites.get(toDef.filePath) as any[] | undefined) ?? readJsonArray(toDef.filePath);
            pendingWrites.set(toDef.filePath, toFileJson);
        }

        for (const s of suggestions) {
            const msg = `Map "${s.fromKey}" -> "${s.toKey}" ? (score=${s.score.toFixed(2)})`;
            const accept = opts.yes ? true : await askYesNo(rl!, msg, s.score >= 0.85);

            if (!accept) continue;

            console.log(`  ✅ accepted: ${s.fromKey} -> ${s.toKey}`);

            if (opts.apply && toFileJson) {
                applyAliasMapping(toFileJson, toDef.def.formKey, toDef.def.version, s.toKey, s.fromKey);
            }
        }
    }

    if (rl) rl.close();

    if (opts.apply && pendingWrites.size > 0) {
        for (const [filePath, json] of pendingWrites.entries()) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
            console.log(`\n✍️  wrote: ${filePath}`);
        }
    } else if (opts.apply) {
        console.log("\nNothing to write.");
    }

    console.log("\nDone.");
}

function loadDefinitionsWithSource(dirAbs: string): LoadedDef[] {
    const files = fs
        .readdirSync(dirAbs)
        .filter(f => f.toLowerCase().endsWith(".json"))
        .map(f => path.join(dirAbs, f));

    const out: LoadedDef[] = [];
    for (const filePath of files) {
        const arr = readJsonArray(filePath);
        for (let i = 0; i < arr.length; i++) {
            const def = arr[i] as PersistxFormDefinition;
            // minimal check (core loader does deep validation; here we keep CLI tolerant)
            if (!def?.formKey || !def?.version || !def?.fields) continue;
            out.push({ filePath, defIndexInFile: i, def });
        }
    }
    return out;
}

function readJsonArray(filePath: string): any[] {
    const raw = fs.readFileSync(filePath, "utf-8");
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (e: any) {
        throw new Error(`Invalid JSON: ${filePath} (${e?.message ?? String(e)})`);
    }
    if (!Array.isArray(parsed)) throw new Error(`Definitions file must be an array: ${filePath}`);
    return parsed;
}

type RenameSuggestion = { fromKey: string; toKey: string; score: number };

function suggestRenames(fromDef: PersistxFormDefinition, toDef: PersistxFormDefinition): RenameSuggestion[] {
    const fromKeys: Set<string> = new Set(fromDef.fields.map((f) => f.key));
    const toKeys: Set<string> = new Set(toDef.fields.map((f) => f.key));

    const removed: string[] = [...fromKeys].filter((k) => !toKeys.has(k));
    const added: string[] = [...toKeys].filter((k) => !fromKeys.has(k));

    if (removed.length === 0 || added.length === 0) return [];

    // score every removed->added pair, keep best matches
    const pairs: RenameSuggestion[] = [];
    for (const r of removed) {
        let best: RenameSuggestion | null = null;
        for (const a of added) {
            const score = similarityScore(r, a);
            if (!best || score > best.score) best = { fromKey: r, toKey: a, score };
        }
        if (best && best.score >= 0.6) pairs.push(best);
    }

    // sort by highest confidence
    pairs.sort((x, y) => y.score - x.score);

    // dedupe by toKey (only one mapping per toKey)
    const usedTo = new Set<string>();
    const final: RenameSuggestion[] = [];
    for (const p of pairs) {
        if (usedTo.has(p.toKey)) continue;
        usedTo.add(p.toKey);
        final.push(p);
    }

    return final;
}

// Heuristic similarity: normalize + levenshtein-based score
function similarityScore(a: string, b: string): number {
    const na = normalizeKey(a);
    const nb = normalizeKey(b);

    if (na === nb) return 1.0;

    const d = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length) || 1;
    const ratio = 1 - d / maxLen;

    // small bonus if one contains the other after normalize
    const containsBonus =
        na.includes(nb) || nb.includes(na) ? 0.08 : 0;

    return clamp(ratio + containsBonus, 0, 1);
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

function applyAliasMapping(
    fileJsonArray: any[],
    formKey: string,
    version: number,
    toKey: string,
    fromKey: string
) {
    // find the target definition in this file
    const defObj = fileJsonArray.find((d: any) => d?.formKey === formKey && d?.version === version);
    if (!defObj) throw new Error(`Cannot apply mapping: target def not found in file for ${formKey}@${version}`);

    const field = (defObj.fields ?? []).find((f: any) => f?.key === toKey);
    if (!field) throw new Error(`Cannot apply mapping: field "${toKey}" not found in ${formKey}@${version}`);

    const aliases: string[] = Array.isArray(field.aliases) ? field.aliases : [];
    if (!aliases.includes(fromKey)) aliases.push(fromKey);
    field.aliases = aliases;
}
