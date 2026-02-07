# PersistX

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-stable-brightgreen)
![Browser Safe](https://img.shields.io/badge/runtime-browser--safe-blue)
![Schema Evolution](https://img.shields.io/badge/schema-evolution--safe-purple)

**PersistX** is a **schema-driven persistence engine** designed to make form submissions, versioning, and data evolution **safe, explicit, and predictable**.

It sits between your **frontend forms** and **backend storage**, enforcing:

- schema validation
- versioned writes
- safe field renames (via aliases)
- forward-compatible migrations

PersistX is **not an ORM** and **not a database**.  
It is a **persistence contract**.

---

## 📖 Table of Contents

- [🚀 Try the Interactive Demo](#-try-the-interactive-demo-recommended)
- [📦 Installation](#-installation)
- [⚡ Quick Start](#-quick-start)
- [Why PersistX?](#why-persistx)
- [What the Demo Teaches](#what-the-demo-teaches)
- [Core Concepts](#core-concepts)
- [CLI Workflow](#cli-workflow-schema-evolution)
- [Runtime Safety Guarantees](#runtime-safety-guarantees)
- [Why not Zod / Prisma / Drizzle?](#why-not-zod--prisma--drizzle)
- [When Should You Use PersistX?](#when-should-you-use-persistx)
- [Adapter Example](#adapter-example)
- [Status](#status)
- [License](#license)
- [Philosophy](#philosophy)

---

## 🚀 Try the Interactive Demo (Recommended)

👉 **[🚀 Live Interactive Demo](https://yeshansachithak.github.io/persistx/)**

The demo is the fastest way to understand PersistX. It walks you through:

1. **Baseline save** (UI + schema match)
2. **Schema mismatch** (UI changes faster than schema)
3. **Safe rename using aliases**

You can:

- switch between **form mode** and **raw JSON**
- simulate **legacy vs modern clients**
- preview **alias mapping and unknown fields**
- inspect the **exact adapter request**
- view the **stored DB snapshot**

This is not a mock — it's the real engine.

---

### What the demo teaches

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

The interactive tutorial mirrors the PersistX pipeline exactly:

```
validate → normalize → map → save
```

If you understand the demo, you understand PersistX.

---

## 📦 Installation

```bash
npm install @persistx/core
# or
yarn add @persistx/core
```

For CLI features:

```bash
npm install -g @persistx/cli
# or use via npx
npx @persistx/cli init
```

---

## ⚡ Quick Start

```typescript
import { createPersistx, createInMemoryRegistry } from "@persistx/core";

// 1. Define your schema
const definitions = [
  {
    formKey: "userProfile",
    version: 1,
    collection: "profiles",
    writeMode: "upsert",
    allowUnknownFields: false,
    fields: [
      { key: "name", type: "string", rules: [{ kind: "required" }] },
      { key: "email", type: "string", rules: [{ kind: "required" }] },
    ],
  },
];

// 2. Create engine
const registry = createInMemoryRegistry(definitions);
const persistx = createPersistx({
  registry,
  adapter: myDatabaseAdapter, // Your Firestore/MongoDB/etc adapter
});

// 3. Submit data
await persistx.submit(
  "userProfile",
  {
    name: "Alice",
    email: "alice@example.com",
  },
  { uid: "user-123" },
);
```

---

## Why PersistX?

Most systems break when forms evolve:

- fields get renamed
- payloads change shape
- old clients keep sending old data

PersistX solves this by making **schema versioning a first-class runtime concept**.

You get:

- explicit `formKey` + `schemaVersion`
- safe upserts with controlled document IDs
- human-reviewable schema diffs
- deterministic, explicit migrations

No magic.  
No silent data loss.  
No guessing.

---

## Core Concepts

### 1. Form Definitions

A **Form Definition** describes:

- what data is allowed
- how it is validated
- how document IDs are generated
- how writes behave (create / update / upsert)

Example:

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

### 2. PersistX Engine

```ts
import { createPersistx, createInMemoryRegistry } from "@persistx/core";

const registry = createInMemoryRegistry(definitions);
const persistx = createPersistx({ adapter, registry });

await persistx.submit("petProfile", payload, { uid: "user-001" });
```

PersistX guarantees:

1. schema resolution
2. validation
3. normalization
4. alias mapping
5. unknown-field detection
6. ID resolution
7. adapter save

Adapters **never receive invalid or unmapped data**.

---

## CLI Workflow (Schema Evolution)

PersistX ships with a **Node-only CLI**.

### Initialize schema

```bash
persistx init
```

### Diff schema safely

```bash
persistx diff --file schema.json
```

Example output:

```
Map "petType" → "type" ? (confidence=0.65)
```

Apply explicitly:

```bash
persistx diff --apply
```

PersistX **never guesses renames at runtime**.

### Migrate existing data

Preview migration:

```bash
persistx migrate --form petProfile --input old-data.json
```

Apply migration:

```bash
persistx migrate --form petProfile --input old-data.json --apply
```

---

## Runtime Safety Guarantees

PersistX guarantees:

- ❌ unknown fields are rejected (unless explicitly allowed)
- ❌ invalid payloads never reach storage
- ❌ silent renames never happen
- ✅ schema changes are explicit and reviewable
- ✅ adapters receive only validated, canonical data

If data reaches your adapter, it is **safe by construction**.

---

## Browser vs Node Boundary

- `@persistx/core` is **browser-safe**
- no `fs`, `path`, or Node APIs
- safe for Vite, Webpack, Edge runtimes

CLI tooling lives in:

- `@persistx/cli` (Node-only)

This boundary is intentional.

---

## Why not Zod / Prisma / Drizzle?

PersistX does **not replace** these tools. It solves a _different problem_.

| Problem                        | Zod | Prisma | Drizzle | **PersistX** |
| ------------------------------ | --- | ------ | ------- | ------------ |
| Runtime validation             | ✅  | ❌     | ❌      | ✅           |
| Database queries               | ❌  | ✅     | ✅      | ❌           |
| Schema evolution               | ❌  | ⚠️     | ⚠️      | ✅           |
| Legacy client support          | ❌  | ❌     | ❌      | ✅           |
| Safe field renames             | ❌  | ❌     | ❌      | ✅           |
| Multi-client payload contracts | ❌  | ❌     | ❌      | ✅           |

**PersistX lives between frontend payloads and storage**, where schema drift actually happens.

It complements Zod and ORMs — it doesn't compete with them.

## The Core Difference (Summary)

| Tool         | Validates payloads | Handles persistence | Handles evolution | Protects legacy clients |
| ------------ | ------------------ | ------------------- | ----------------- | ----------------------- |
| Zod          | ✅ Yes             | ❌ No               | ❌ No             | ❌ No                   |
| Prisma       | ❌ No              | ✅ Yes              | ⚠️ Partial        | ❌ No                   |
| Drizzle      | ❌ No              | ✅ Yes              | ⚠️ Partial        | ❌ No                   |
| **PersistX** | ✅ Yes             | ✅ Yes              | ✅ Yes            | ✅ Yes                  |

PersistX exists because **schema evolution is a runtime problem**, not just a compile-time one.

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

## Who Is It For?

PersistX is for teams that:

- ship multiple clients
- cannot force synchronized upgrades
- care deeply about data integrity
- want evolution without chaos

If your schema never changes, you don’t need PersistX.
If it does — you probably already do.

---

## Status

- **Core**: Stable
- **Demo**: Production-ready
- **CLI**: Evolving
- **Adapters**: In progress

---

## License

MIT

---

## Philosophy

> **"Schema evolution should be boring, safe, and reviewable."**

PersistX makes that real by providing a robust contract layer that protects your data as your applications evolve, ensuring that both new and legacy clients can coexist without breaking your persistence layer.
