# @persistx/validator-zod

![Status](https://img.shields.io/badge/status-stable-brightgreen)

**@persistx/validator-zod** provides a **Zod-powered validation backend**
for PersistX schemas.

It allows PersistX to use **Zod under the hood** while keeping
PersistX schemas **framework-agnostic**.

---

## Why This Exists

PersistX does **not depend on Zod directly**.

This package:

- maps PersistX field definitions → Zod schemas
- runs validation using Zod
- returns normalized validation results to the core engine

This keeps:
- `@persistx/core` lightweight
- validation pluggable
- runtime behavior explicit

---

## Installation

```bash
npm install @persistx/validator-zod
````

---

## Usage

```ts
import { createPersistx } from "@persistx/core";
import { zodValidator } from "@persistx/validator-zod";

const persistx = createPersistx({
  registry,
  adapter,
  validator: zodValidator(),
});
```

---

## Supported Field Types

This validator supports:

* `string`
* `number`
* `boolean`
* `object`
* `array`

Including:

* required rules
* nullable fields
* basic constraints

Schema evolution logic **does not live here**.

---

## What This Package Does NOT Do

* ❌ schema diffing
* ❌ migrations
* ❌ persistence
* ❌ form rendering

It only validates.

---

## License

MIT