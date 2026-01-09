# PersistX

**PersistX** is a schema-driven persistence engine designed to make form submissions, versioning, and data evolution *safe, explicit, and predictable*.

It sits between your **frontend forms** and **backend storage**, enforcing:

* schema validation
* versioned writes
* safe field renames
* forward-compatible migrations

PersistX is **not an ORM** and **not a database**.
It is a *persistence contract*.

---

## Why PersistX?

Most systems break when forms evolve:

* fields get renamed
* payloads change shape
* old clients still send old data

PersistX solves this by making **schema versioning a first-class concept**.

You get:

* explicit `formKey` + `version`
* safe upserts with controlled IDs
* human-reviewed diffs
* deterministic migrations

No magic. No silent data loss.

---

## Core Concepts

### 1. Form Definitions

A **Form Definition** describes:

* what data is allowed
* how it is validated
* where it is stored
* how document IDs are generated

Example (`schema.json`):

```json
{
  "persistx": 1,
  "definitions": [
    {
      "formKey": "petProfile",
      "version": 1,
      "collection": "petProfiles",
      "docIdStrategy": { "kind": "uid" },
      "writeMode": "upsert",
      "allowUnknownFields": false,
      "fields": [
        { "key": "petName", "type": "string", "rules": [{ "kind": "required" }] },
        { "key": "petType", "type": "string", "rules": [{ "kind": "required" }] },
        { "key": "age", "type": "number", "nullable": true }
      ]
    }
  ]
}
```

---

### 2. PersistX Engine

The engine is created at runtime:

```ts
import { createPersistx, createInMemoryRegistry } from "@persistx/core";

const registry = createInMemoryRegistry(definitions);
const persistx = createPersistx({ adapter, registry });
```

You then submit payloads:

```ts
await persistx.submit("petProfile", payload, { uid: "user-001" });
```

PersistX will:

1. resolve schema version
2. validate payload
3. normalize values
4. map fields
5. resolve document ID
6. call adapter.save()

---

## CLI Workflow

PersistX ships with a **Node-only CLI** for managing schemas and migrations.

### 1. Initialize Schema

```bash
persistx init
```

Creates:

```
definitions/schema.json
```

Single-file schema (recommended).

---

### 2. Evolve a Form

Example: rename `petType` → `type`, bump version to `2`.

```json
{
  "formKey": "petProfile",
  "version": 2,
  "fields": [
    { "key": "petName" },
    { "key": "type" },
    { "key": "age" }
  ]
}
```

---

### 3. Diff Schemas (Safe Renames)

```bash
persistx diff --file definitions/schema.json
```

Output:

```
=== petProfile: v1 -> v2 ===
Map "petType" -> "type" ? (score=0.65)
```

Apply aliases:

```bash
persistx diff --file definitions/schema.json --apply
```

Result:

```json
{
  "key": "type",
  "aliases": ["petType"]
}
```

---

### 4. Migrate Existing Data

```bash
persistx migrate \
  --form petProfile \
  --input payload.json
```

Preview output.

Apply:

```bash
persistx migrate \
  --form petProfile \
  --input payload.json \
  --apply
```

Writes:

```
payload.json.migrated.json
```

---

## Runtime Safety Guarantees

PersistX guarantees:

* ❌ unknown fields are dropped (unless allowed)
* ❌ invalid payloads never reach storage
* ❌ silent renames never happen
* ✅ all migrations are explicit
* ✅ adapters never see unvalidated data

---

## Browser vs Node Boundary

* `@persistx/core` is **browser-safe**
* No `fs`, `path`, or Node APIs
* CLI tools live in `@persistx/cli`

This ensures:

* safe Vite / Webpack builds
* no accidental server-only imports

---

## What PersistX Is NOT

* ❌ ORM
* ❌ Database
* ❌ Form renderer
* ❌ Backend framework

PersistX is a **contract layer**.

---

## Status

* Core: stable
* CLI: evolving
* Adapters: in progress

---

## License

MIT

---

## Philosophy

> "Schema evolution should be boring, safe, and reviewable."

PersistX exists to make that true.
