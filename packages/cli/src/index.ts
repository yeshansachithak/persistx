#!/usr/bin/env node
// packages/cli/src/index.ts
import { runDiff } from "./diff.js";
import { runInit } from "./init.js";
import { runMigrate } from "./migrate.js";

async function main() {
    const args = process.argv.slice(2);

    const cmd = args[0];
    if (!cmd || cmd === "-h" || cmd === "--help") {
        printHelp();
        process.exit(0);
    }

    if (cmd === "init") {
        const opts = parseInitArgs(args.slice(1));
        await runInit(opts);
        return;
    }

    if (cmd === "diff") {
        const opts = parseDiffArgs(args.slice(1));
        await runDiff(opts);
        return;
    }

    if (cmd === "migrate") {
        const opts = parseMigrateArgs(args.slice(1));
        await runMigrate(opts);
        return;
    }

    console.error(`Unknown command: ${cmd}\n`);
    printHelp();
    process.exit(1);
}

function printHelp() {
    console.log(`
persistx (PersistX CLI)

Usage:
  persistx init [--file <schemaFile>] [--force]
  persistx diff [--file <schemaFile>] [--apply] [--yes] [--force-yes] [--min-score <n>] [--strict] [--form <formKey>] [--from <v>] [--to <v>] [--cwd <path>]
  persistx migrate [--file <schemaFile>] --form <formKey> [--from <v>] [--to <v>] --input <jsonFile> [--out <jsonFile>] [--apply] [--keep-unknown] [--report] [--cwd <path>]

Commands:
  init     Create a single schema.json (Option A)
  diff     Suggest alias mappings (field renames) between versions
  migrate  Transform payload JSON from one version to another

Options:
  --file       Schema file path (default: ./definitions/schema.json)
  --cwd        Base directory to resolve --file/--input/--out (default: current working directory)
  --apply      Write changes (diff: updates schema; migrate: writes migrated output)
  --yes        Non-interactive (diff only). Auto-accept SAFE suggestions only.
  --force-yes  With --yes, accept even ambiguous/low-confidence suggestions (dangerous).
  --min-score  Minimum score for suggestions (default: 0.70)
  --strict     Make it harder to map into generic keys like "type", "id" unless very high confidence
  --form       Only run for a specific formKey
  --from       Compare/migrate from version (optional)
  --to         Compare/migrate to version (optional)
  --force      Overwrite schema file (init only)

Migrate options:
  --input       Input JSON file containing payload or array of payloads
  --out         Output JSON file (default: <input>.migrated.json)
  --keep-unknown Put dropped keys under _unknown instead of discarding them
  --report      Print a per-payload migration report to stderr

Examples:
  persistx init
  persistx diff --file ./demo-vite-app/public/schema.json
  persistx diff --file ./demo-vite-app/public/schema.json --apply
  persistx diff --file ./demo-vite-app/public/schema.json --yes
  persistx migrate --file ./demo-vite-app/public/schema.json --form petProfile --from 1 --to 2 --input ./payload.json --apply
`);
}

function parseInitArgs(args: string[]) {
    const opts: { file: string; force: boolean } = {
        file: "./definitions/schema.json",
        force: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--file") opts.file = String(args[++i] ?? opts.file);
        else if (a === "--force") opts.force = true;
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        } else {
            console.warn(`Ignoring unknown arg: ${a}`);
        }
    }

    return opts;
}

function parseDiffArgs(args: string[]) {
    const opts: {
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
    } = {
        file: "./definitions/schema.json",
        apply: false,
        yes: false,
        forceYes: false,
        minScore: 0.7,
        strict: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === "--file") opts.file = String(args[++i] ?? opts.file);
        else if (a === "--cwd") opts.cwd = String(args[++i] ?? "");
        else if (a === "--apply") opts.apply = true;
        else if (a === "--yes") opts.yes = true;
        else if (a === "--force-yes") opts.forceYes = true;
        else if (a === "--min-score") opts.minScore = Number(args[++i]);
        else if (a === "--strict") opts.strict = true;
        else if (a === "--form") opts.form = String(args[++i] ?? "");
        else if (a === "--from") opts.from = Number(args[++i]);
        else if (a === "--to") opts.to = Number(args[++i]);
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        } else {
            console.warn(`Ignoring unknown arg: ${a}`);
        }
    }

    if (!Number.isFinite(opts.minScore) || opts.minScore < 0 || opts.minScore > 1) {
        throw new Error(`--min-score must be between 0 and 1`);
    }

    if (opts.from !== undefined && (!Number.isInteger(opts.from) || opts.from < 1)) {
        throw new Error(`--from must be an integer >= 1`);
    }
    if (opts.to !== undefined && (!Number.isInteger(opts.to) || opts.to < 1)) {
        throw new Error(`--to must be an integer >= 1`);
    }

    return opts;
}

type MigrateArgs = {
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
};

function parseMigrateArgs(args: string[]) {
    const opts: {
        file: string;
        cwd?: string;
        form?: string;
        from?: number;
        to?: number;
        input?: string;
        out?: string;
        apply: boolean;
        keepUnknown: boolean;
        report: boolean;
    } = {
        file: "./definitions/schema.json",
        apply: false,
        keepUnknown: false,
        report: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === "--file") opts.file = String(args[++i] ?? opts.file);
        else if (a === "--cwd") opts.cwd = String(args[++i] ?? "");
        else if (a === "--form") opts.form = String(args[++i] ?? "");
        else if (a === "--from") opts.from = Number(args[++i]);
        else if (a === "--to") opts.to = Number(args[++i]);
        else if (a === "--input") opts.input = String(args[++i] ?? "");
        else if (a === "--out") opts.out = String(args[++i] ?? "");
        else if (a === "--apply") opts.apply = true;
        else if (a === "--keep-unknown") opts.keepUnknown = true;
        else if (a === "--report") opts.report = true;
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        } else {
            console.warn(`Ignoring unknown arg: ${a}`);
        }
    }

    const form = opts.form;
    const input = opts.input;

    if (!form) throw new Error(`migrate requires --form <formKey>`);
    if (!input) throw new Error(`migrate requires --input <jsonFile>`);

    if (!opts.form) throw new Error(`migrate requires --form <formKey>`);
    if (!opts.input) throw new Error(`migrate requires --input <jsonFile>`);

    if (opts.from !== undefined && (!Number.isInteger(opts.from) || opts.from < 1)) {
        throw new Error(`--from must be an integer >= 1`);
    }
    if (opts.to !== undefined && (!Number.isInteger(opts.to) || opts.to < 1)) {
        throw new Error(`--to must be an integer >= 1`);
    }

    return {
        ...opts,
        form,
        input
    };
}

main().catch((e) => {
    console.error(e?.message ?? String(e));
    process.exit(1);
});
