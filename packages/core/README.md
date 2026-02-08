# @persistx/core

![Browser Safe](https://img.shields.io/badge/runtime-browser--safe-blue)
![Status](https://img.shields.io/badge/status-stable-brightgreen)

**@persistx/core** is the **browser-safe runtime engine** of PersistX.

It validates, normalizes, and safely persists evolving form payloads using
**explicit, versioned schemas**.

This package contains **no Node.js APIs** and is safe to use in:
- browsers
- Vite / Webpack
- edge runtimes
- serverless environments

---

## What This Package Does

`@persistx/core` is responsible for:

- schema resolution (`formKey + version`)
- runtime validation
- alias-based field renames
- unknown-field detection
- deterministic ID resolution
- producing **adapter-safe persistence requests**

It guarantees that adapters **never receive invalid or unmapped data**.

---

## What This Package Is NOT

- ❌ not a database
- ❌ not an ORM
- ❌ not a query builder
- ❌ not a form renderer

It is a **persistence contract engine**.

---

## Installation

```bash
npm install @persistx/core
````

---

## Basic Usage

```ts
import { createPersistx, createInMemoryRegistry } from "@persistx/core";

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

const registry = createInMemoryRegistry(definitions);

const persistx = createPersistx({
  registry,
  adapter: myAdapter,
});

await persistx.submit(
  "userProfile",
  { name: "Alice", email: "alice@example.com" },
  { uid: "user-123" },
);
```

---

## Adapter Contract

Adapters receive **fully validated, canonical data**:

```ts
import type { PersistxAdapter } from "@persistx/core";

const adapter: PersistxAdapter = {
  async save(req) {
    // req.data is already safe
  },
};
```

Adapters do **not** perform validation or migrations.

---

## Browser vs Node Boundary

* ✅ This package is browser-safe
* ❌ No `fs`, `path`, or Node APIs

CLI tooling lives in `@persistx/cli`.

---

## License

MIT
