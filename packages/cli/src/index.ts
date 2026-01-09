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
  persistx diff [--file <schemaFile>] [--apply] [--yes] [--form <formKey>] [--from <v>] [--to <v>]
  persistx migrate [--file <schemaFile>] --form <formKey> [--from <v>] [--to <v>] --input <jsonFile> [--out <jsonFile>] [--apply]

Commands:
  init     Create a single schema.json (Option A) at definitions/schema.json
  diff     Suggest "aliases" mappings (field renames) between versions
  migrate  Transform payload JSON from one version to another (preview or write)

Options:
  --file   Schema file path (default: ./definitions/schema.json)
  --apply  Write changes (diff: updates schema; migrate: writes migrated output)
  --yes    Auto-accept suggestions (diff only)
  --form   Only run for a specific formKey
  --from   Compare/migrate from version (optional)
  --to     Compare/migrate to version (optional)
  --force  Overwrite schema file (init only)

Migrate options:
  --input  Input JSON file containing payload or array of payloads
  --out    Output JSON file (default: <input>.migrated.json)

Examples:
  persistx init
  persistx diff --file ./definitions/schema.json --apply
  persistx migrate --form petProfile --input ./payload.json --apply
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
        apply: boolean;
        yes: boolean;
        form?: string;
        from?: number;
        to?: number;
    } = {
        file: "./definitions/schema.json",
        apply: false,
        yes: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === "--file") opts.file = String(args[++i] ?? opts.file);
        else if (a === "--apply") opts.apply = true;
        else if (a === "--yes") opts.yes = true;
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

    if (opts.from !== undefined && (!Number.isInteger(opts.from) || opts.from < 1)) {
        throw new Error(`--from must be an integer >= 1`);
    }
    if (opts.to !== undefined && (!Number.isInteger(opts.to) || opts.to < 1)) {
        throw new Error(`--to must be an integer >= 1`);
    }

    return opts;
}

function parseMigrateArgs(args: string[]) {
    const opts: {
        file: string;
        form?: string;
        from?: number;
        to?: number;
        input?: string;
        out?: string;
        apply: boolean;
    } = {
        file: "./definitions/schema.json",
        apply: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === "--file") opts.file = String(args[++i] ?? opts.file);
        else if (a === "--form") opts.form = String(args[++i] ?? "");
        else if (a === "--from") opts.from = Number(args[++i]);
        else if (a === "--to") opts.to = Number(args[++i]);
        else if (a === "--input") opts.input = String(args[++i] ?? "");
        else if (a === "--out") opts.out = String(args[++i] ?? "");
        else if (a === "--apply") opts.apply = true;
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        } else {
            console.warn(`Ignoring unknown arg: ${a}`);
        }
    }

    if (!opts.form) throw new Error(`migrate requires --form <formKey>`);
    if (!opts.input) throw new Error(`migrate requires --input <jsonFile>`);

    if (opts.from !== undefined && (!Number.isInteger(opts.from) || opts.from < 1)) {
        throw new Error(`--from must be an integer >= 1`);
    }
    if (opts.to !== undefined && (!Number.isInteger(opts.to) || opts.to < 1)) {
        throw new Error(`--to must be an integer >= 1`);
    }

    return opts;
}

main().catch((e) => {
    console.error(e?.message ?? String(e));
    process.exit(1);
});
