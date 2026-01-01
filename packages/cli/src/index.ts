#!/usr/bin/env node

import { runDiff } from "./diff.js";

// packages/cli/src/index.ts

async function main() {
    const args = process.argv.slice(2);

    const cmd = args[0];
    if (!cmd || cmd === "-h" || cmd === "--help") {
        printHelp();
        process.exit(0);
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
  persistx diff [--dir <definitionsDir>] [--apply] [--yes] [--form <formKey>] [--from <v>] [--to <v>]

Commands:
  diff    Compare schema versions and suggest "aliases" mappings (field renames)

Options:
  --dir    Definitions directory (default: ./definitions)
  --apply  Write aliases back into the "to" version json file
  --yes    Auto-accept suggested mappings (non-interactive)
  --form   Only run for a specific formKey
  --from   Compare from version (optional)
  --to     Compare to version (optional)

Examples:
  persistx diff
  persistx diff --dir ./definitions
  persistx diff --form skill --apply
  persistx diff --from 1 --to 2 --apply
`);
}

function parseDiffArgs(args: string[]) {
    const opts: {
        dir: string;
        apply: boolean;
        yes: boolean;
        form?: string;
        from?: number;
        to?: number;
    } = {
        dir: "./definitions",
        apply: false,
        yes: false
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === "--dir") opts.dir = String(args[++i] ?? opts.dir);
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

main().catch((e) => {
    console.error(e?.message ?? String(e));
    process.exit(1);
});
