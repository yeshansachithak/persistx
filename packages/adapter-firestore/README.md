# @persistx/adapter-firestore

![Status](https://img.shields.io/badge/status-experimental-yellow)

**@persistx/adapter-firestore** is a Firestore persistence adapter
for PersistX.

It converts validated PersistX save requests into Firestore writes.

---

## What This Adapter Does

- receives canonical data from PersistX
- resolves document IDs
- performs `set()` or `update()` safely
- returns persistence metadata

It assumes **all validation and schema logic is already done**.

---

## Installation

```bash
npm install @persistx/adapter-firestore
````

---

## Usage

```ts
import { createPersistx } from "@persistx/core";
import { firestoreAdapter } from "@persistx/adapter-firestore";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

const persistx = createPersistx({
  registry,
  adapter: firestoreAdapter(db),
});
```

---

## Write Behavior

The adapter respects:

* `collection`
* `writeMode` (`create`, `update`, `upsert`)
* ID strategies (`uid`, `fixed`, etc.)

Firestore writes are deterministic and explicit.

---

## What This Adapter Does NOT Do

* ❌ validation
* ❌ schema evolution
* ❌ alias mapping
* ❌ migrations

Those are handled by PersistX core.

---

## Status

This adapter is **functional but evolving**.

APIs may expand as PersistX adapters mature.

---

## License

MIT