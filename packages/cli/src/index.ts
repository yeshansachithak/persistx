#!/usr/bin/env node

// packages/cli/src/index.ts
import fs from "node:fs";
import path from "node:path";
import { runDiff } from "./diff.js";

type DiffOpts = {
    file: string;
    apply: boolean;
    yes: boolean;
    form?: string;
    from?: number;
    to?: number;
};

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

Commands:
  init    Create a single schema.json (Option A) at definitions/schema.json
  diff    Compare schema versions and suggest "aliases" mappings (field renames)

Options:
  --file   Schema file path (default: ./definitions/schema.json)
  --apply  Write aliases back into the "to" version definition
  --yes    Auto-accept suggested mappings (non-interactive)
  --form   Only run for a specific formKey
  --from   Compare from version (optional)
  --to     Compare to version (optional)
  --force  Overwrite schema file (init only)

Examples:
  persistx init
  persistx init --file ./definitions/schema.json
  persistx diff
  persistx diff --file ./definitions/schema.json --apply
  persistx diff --form profile --apply
  persistx diff --from 1 --to 2 --apply
`);
}

function parseCommonFileArg(args: string[]) {
    let file = "./definitions/schema.json";
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--file") file = String(args[++i] ?? file);
    }
    return file;
}

function parseInitArgs(args: string[]) {
    const opts: { file: string; force: boolean } = {
        file: parseCommonFileArg(args),
        force: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--file") { i++; continue; }
        if (a === "--force") opts.force = true;
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        } else {
            console.warn(`Ignoring unknown arg: ${a}`);
        }
    }
    return opts;
}

function parseDiffArgs(args: string[]): DiffOpts {
    const opts: DiffOpts = {
        file: parseCommonFileArg(args),
        apply: false,
        yes: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === "--file") { opts.file = String(args[++i] ?? opts.file); }
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

async function runInit(opts: { file: string; force: boolean }) {
    const fileAbs = path.resolve(process.cwd(), opts.file);
    const dir = path.dirname(fileAbs);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(fileAbs) && !opts.force) {
        console.log(`Schema file already exists: ${fileAbs}`);
        console.log(`Use --force to overwrite.`);
        return;
    }

    const schema = { persistx: 1, definitions: [] as any[] };
    fs.writeFileSync(fileAbs, JSON.stringify(schema, null, 2) + "\n", "utf-8");

    console.log(`✅ created: ${fileAbs}`);
}

main().catch((e) => {
    console.error(e?.message ?? String(e));
    process.exit(1);
});
