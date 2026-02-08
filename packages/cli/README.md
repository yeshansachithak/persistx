# @persistx/cli

![Node Only](https://img.shields.io/badge/runtime-node--only-red)
![Status](https://img.shields.io/badge/status-evolving-yellow)

**@persistx/cli** provides **Node-only tooling** for managing
PersistX schemas safely.

It is intentionally separated from the runtime engine.

---

## What This CLI Does

The CLI helps you:

- initialize schema files
- diff schema versions
- safely map field renames
- preview migrations
- apply migrations explicitly

It never runs in the browser.

---

## Installation

```bash
npm install -g @persistx/cli
````

Or use via `npx`:

```bash
npx @persistx/cli init
```

---

## Commands

### Initialize schema

```bash
persistx init
```

Creates a versioned schema file.

---

### Diff schema changes

```bash
persistx diff --file schema.json
```

Example:

```
Map "petType" → "type" ? (confidence=0.65)
```

Nothing is applied automatically.

---

### Apply diff explicitly

```bash
persistx diff --apply
```

---

### Migrate existing data

Preview:

```bash
persistx migrate --form petProfile --input data.json
```

Apply:

```bash
persistx migrate --form petProfile --input data.json --apply
```

---

## Design Philosophy

* ❌ no runtime guessing
* ❌ no silent renames
* ✅ explicit, reviewable evolution
* ✅ human-in-the-loop decisions

---

## Browser vs Node Boundary

* ❌ Not browser-safe
* ✅ Uses `fs`, `path`, Node APIs

Runtime logic lives in `@persistx/core`.

---

## License

MIT