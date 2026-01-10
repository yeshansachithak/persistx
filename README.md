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

## Try the Demo (Recommended)

The fastest way to understand PersistX is to run the interactive demo.

```bash
yarn install
yarn workspace demo-vite-app dev
```

What the demo shows:

* **Step 1 — Configure**: pick `formKey`, schema version, and `context.uid`
* **Step 2 — Payload**: paste legacy or modern JSON payloads
* **Step 3 — Analyze**: see validation, normalization, alias mapping, and unknown-field detection
* **Step 4 — Submit**: inspect the exact data sent to `adapter.save()` and the stored DB snapshot

The demo mirrors the internal pipeline:

> validate → normalize → map → save

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
4. map fields (apply aliases, drop unknowns)
5. resolve document ID
6. call `adapter.save()`

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

A single-file schema (recommended).

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

## When Should You Use PersistX?

PersistX is a good fit when:

* you have **multiple clients** (web, mobile, kiosk, legacy) submitting data
* your **schemas evolve over time** and old clients must keep working
* you want **explicit control** over renames, versions, and migrations
* you use **document-style storage** (Firestore, MongoDB, KV stores, REST APIs)

If your data model is static and tightly coupled to a single backend, PersistX may be unnecessary.

---

## Adapter Example

PersistX adapters are intentionally small and explicit. A typical Firestore-style adapter looks like:

```ts
import type { PersistxAdapter } from "@persistx/core";

const adapter: PersistxAdapter = {
  async save(req) {
    const id = req.idStrategy.kind === "fixed"
      ? req.idStrategy.id
      : crypto.randomUUID();

    await db
      .collection(req.collection)
      .doc(id)
      .set(req.data, { merge: req.mode === "upsert" });

    return {
      collection: req.collection,
      id,
      mode: req.mode,
      schemaVersion: req.schemaVersion,
      savedAt: new Date().toISOString()
    };
  }
};
```

Adapters **never receive invalid or unmapped data** — PersistX enforces that contract.

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
