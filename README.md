# PersistX

**PersistX** is a schema-driven persistence engine designed to make form submissions, versioning, and data evolution **safe, explicit, and predictable**.

It sits between your **frontend forms** and **backend storage**, enforcing:

- schema validation
- versioned writes
- safe field renames (via aliases)
- forward-compatible migrations

PersistX is **not an ORM** and **not a database**.  
It is a **persistence contract**.

---

## Why PersistX?

Most systems break when forms evolve:

- fields get renamed
- payloads change shape
- old clients keep sending old data

PersistX solves this by making **schema versioning a first-class concept**.

You get:

- explicit `formKey` + `schemaVersion`
- safe upserts with controlled document IDs
- human-reviewable schema diffs
- deterministic, explicit migrations

No magic.  
No silent data loss.  
No guessing.

---

## Try the Interactive Demo (Recommended)

The fastest way to understand PersistX is the interactive demo.

```bash
yarn install
yarn workspace demo-vite-app dev
```

What the demo teaches:

1. **Configure**
   - choose `formKey`
   - choose schema version
   - set `context.uid`

2. **Edit Payload**
   - form mode or raw JSON
   - simulate legacy or new clients

3. **Analyze**
   - validation result
   - normalized payload
   - alias mapping
   - unknown-field detection

4. **Submit**
   - inspect the exact adapter request
   - view the stored DB snapshot

The demo mirrors the PersistX pipeline exactly:

```
validate → normalize → map → save
```

If you understand the demo, you understand PersistX.

---

## Core Concepts

### 1. Form Definitions

A **Form Definition** describes:

- what data is allowed
- how it is validated
- how IDs are generated
- how writes behave (create / update / upsert)

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
        {
          "key": "petName",
          "type": "string",
          "rules": [{ "kind": "required" }]
        },
        {
          "key": "petType",
          "type": "string",
          "rules": [{ "kind": "required" }]
        },
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

Submit payloads:

```ts
await persistx.submit("petProfile", payload, { uid: "user-001" });
```

PersistX guarantees the following order:

1. resolve schema version
2. validate payload
3. normalize values
4. map fields (aliases, canonical keys)
5. detect unknown fields
6. resolve document ID
7. call `adapter.save()`

Adapters **never see invalid or unmapped data**.

---

## CLI Workflow (Schema Evolution)

PersistX ships with a **Node-only CLI** for managing schemas safely.

### 1. Initialize Schema

```bash
persistx init
```

Creates:

```
definitions/schema.json
```

A single-file schema is the recommended workflow.

---

### 2. Evolve a Form

Example: rename `petType` → `type`, bump version.

```json
{
  "formKey": "petProfile",
  "version": 2,
  "fields": [{ "key": "petName" }, { "key": "type" }, { "key": "age" }]
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
Map "petType" -> "type" ? (confidence=0.65)
```

Apply aliases explicitly:

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

PersistX **never guesses renames at runtime**.

---

### 4. Migrate Existing Data

Preview migration:

```bash
persistx migrate \
  --form petProfile \
  --input payload.json
```

Apply migration:

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

- ❌ unknown fields are rejected (unless explicitly allowed)
- ❌ invalid payloads never reach storage
- ❌ silent renames never happen
- ✅ schema changes are explicit and reviewable
- ✅ adapters receive only validated, mapped data

If data reaches your adapter, it is **safe by construction**.

---

## Browser vs Node Boundary

- `@persistx/core` is **browser-safe**
- no `fs`, `path`, or Node APIs
- safe for Vite, Webpack, and edge runtimes

CLI tooling lives in:

- `@persistx/cli` (Node-only)

This boundary is intentional.

---

## What PersistX Is NOT

PersistX is **not**:

- ❌ an ORM
- ❌ a database
- ❌ a form renderer
- ❌ a backend framework

PersistX is a **contract layer**.

---

## When Should You Use PersistX?

PersistX is a good fit when:

- you have **multiple clients** (web, mobile, kiosk, legacy)
- schemas evolve but **old clients must keep working**
- renames must be **explicit and safe**
- you use **document-style storage**
  (Firestore, MongoDB, KV stores, REST APIs)

If your schema is static and tightly coupled to one backend, PersistX may be unnecessary.

---

## Adapter Example

A minimal Firestore-style adapter:

```ts
import type { PersistxAdapter } from "@persistx/core";

const adapter: PersistxAdapter = {
  async save(req) {
    const id =
      req.idStrategy.kind === "fixed" ? req.idStrategy.id : crypto.randomUUID();

    await db
      .collection(req.collection)
      .doc(id)
      .set(req.data, { merge: req.mode === "upsert" });

    return {
      collection: req.collection,
      id,
      mode: req.mode,
      schemaVersion: req.schemaVersion,
      savedAt: new Date().toISOString(),
    };
  },
};
```

Adapters stay simple because PersistX does the hard work.

---

## Status

- Core: **stable**
- Demo: **production-ready**
- CLI: evolving
- Adapters: in progress

---

## License

MIT

---

## Philosophy

> **“Schema evolution should be boring, safe, and reviewable.”**
