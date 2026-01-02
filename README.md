# PersistX

PersistX is a schema-first persistence engine for evolving app payloads safely over time.

✅ Versioned form schemas  
✅ Field rename support via `aliases`  
✅ Safe mapping + validation + normalization  
✅ Works in browser (schema via JSON fetch)  
✅ CLI tools to assist schema evolution  

## Packages

- `@persistx/core` — browser-safe engine + types + registry + mapping/validation
- `@persistx/validator-zod` — optional Zod validator package
- `@persistx/adapter-firestore` — Firestore adapter (server-side)
- `@persistx/cli` — CLI tools (`init`, `diff`, `migrate`)

## Quickstart: Demo (Vite + TS)

```bash
npm install --workspaces --include-workspace-root
npm run build:order   # recommended build order
npm run dev -w vite-project
