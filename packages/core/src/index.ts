// packages/core/src/index.ts

// Re-export public browser-safe surface
export * from "./types.js";
export * from "./form-definition.js";
export * from "./registry.js";
export * from "./mapper.js";
export * from "./validation.js";
export * from "./normalize.js";
export * from "./hooks.js";
export * from "./definition-errors.js";

// ❌ IMPORTANT: DO NOT export definition-loader from the browser-safe entry.
// export * from "./definition-loader.js";

import type { PersistxHookRegistry, PersistxHookContext } from "./hooks.js";
import { normalizePayload } from "./normalize.js";
import {
  DefinitionNotFoundError,
  ValidationFailedError,
  DocIdResolutionError,
  HookFailedError
} from "./definition-errors.js";

import type { PersistxFormRegistry } from "./registry.js";
import { validatePayload } from "./validation.js";
import { mapPayload } from "./mapper.js";

import type {
  PersistxMode,
  PersistxSaveRequest,
  PersistxSaveResult,
  PersistxAdapterSaveRequest,
  PersistxAdapter,
  PersistxEngine
} from "./types.js";

export function createPersistx(opts: {
  adapter: PersistxAdapter;
  registry: PersistxFormRegistry;
  hooks?: PersistxHookRegistry;
  normalize?: {
    trimStrings?: boolean;
    coerceDatesToISO?: boolean;
    dropUndefined?: boolean;
  };
}): PersistxEngine {
  const engine: PersistxEngine = {
    async save(req: PersistxSaveRequest<Record<string, unknown>>): Promise<PersistxSaveResult> {
      const resolvedVersion = req.schemaVersion ?? opts.registry.getLatestVersion(req.formKey);
      if (!resolvedVersion) throw new DefinitionNotFoundError(req.formKey, req.schemaVersion ?? -1);

      const def = opts.registry.get(req.formKey, resolvedVersion);
      if (!def) throw new DefinitionNotFoundError(req.formKey, resolvedVersion);

      const nowISO = req.context?.nowISO ?? new Date().toISOString();

      const hookContext: PersistxHookContext = {
        formKey: req.formKey,
        schemaVersion: resolvedVersion,
        mode: (req.mode ?? def.writeMode) as PersistxMode,
        uid: req.context?.uid,
        nowISO,
        save: async (childReq) => engine.save(childReq)
      };

      const payload = (req.payload ?? {}) as Record<string, unknown>;

      // hooks: beforeValidate
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeValidate") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const validation = validatePayload(def, payload);
      if (!validation.ok) {
        throw new ValidationFailedError("Validation failed", {
          errors: validation.errors,
          formKey: req.formKey,
          version: resolvedVersion
        });
      }

      // hooks: afterValidate
      for (const h of def.hooks ?? []) {
        if (h.key !== "afterValidate") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      // hooks: beforeNormalize
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeNormalize") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const normalized = normalizePayload(payload, opts.normalize);

      // hooks: afterNormalize
      for (const h of def.hooks ?? []) {
        if (h.key !== "afterNormalize") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      // hooks: beforeMap
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeMap") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const data = mapPayload(def, normalized);

      // hooks: afterMap
      for (const h of def.hooks ?? []) {
        if (h.key !== "afterMap") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized, mapped: data }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const collection = req.doc?.collection ?? def.collection;

      let idStrategy: PersistxAdapterSaveRequest["idStrategy"] = { kind: "auto" };
      try {
        switch (def.docIdStrategy.kind) {
          case "auto":
            idStrategy = { kind: "auto" };
            break;
          case "fixed":
            idStrategy = { kind: "fixed", id: def.docIdStrategy.id };
            break;
          case "payload": {
            const v = normalized[def.docIdStrategy.key];
            if (typeof v !== "string" || !v) {
              throw new Error(`docIdStrategy.payload key "${def.docIdStrategy.key}" missing`);
            }
            idStrategy = { kind: "fixed", id: v };
            break;
          }
          case "uid": {
            const uid = req.context?.uid;
            if (!uid) throw new Error(`docIdStrategy.id requires context.uid`);
            idStrategy = { kind: "fixed", id: uid };
            break;
          }
        }
      } catch (e: any) {
        throw new DocIdResolutionError(e?.message ?? String(e), {
          formKey: req.formKey,
          version: resolvedVersion
        });
      }

      const mode: PersistxMode = (req.mode ?? def.writeMode) as PersistxMode;

      // hooks: beforeSave
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeSave") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized, mapped: data }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const result = await opts.adapter.save({
        formKey: req.formKey,
        collection,
        idStrategy,
        mode,
        data,
        schemaVersion: resolvedVersion
      });

      // hooks: afterSave
      for (const h of def.hooks ?? []) {
        if (h.key !== "afterSave") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try {
          await fn({
            def,
            context: hookContext,
            payload,
            normalized,
            mapped: data,
            result: { collection: result.collection, id: result.id, savedAt: result.savedAt }
          });
        } catch (e: any) {
          throw new HookFailedError(h.name, e?.message ?? String(e));
        }
      }

      return result;
    },

    async submit(formKey, payload, opts2) {
      return engine.save({
        formKey,
        payload,
        schemaVersion: opts2?.schemaVersion,
        mode: opts2?.mode,
        context: { uid: opts2?.uid }
      });
    },

    async create(formKey, payload, opts2) {
      return engine.save({
        formKey,
        payload,
        schemaVersion: opts2?.schemaVersion,
        mode: "create",
        context: { uid: opts2?.uid }
      });
    },

    async update(formKey, payload, opts2) {
      return engine.save({
        formKey,
        payload,
        schemaVersion: opts2?.schemaVersion,
        mode: "update",
        context: { uid: opts2?.uid }
      });
    },

    async upsert(formKey, payload, opts2) {
      return engine.save({
        formKey,
        payload,
        schemaVersion: opts2?.schemaVersion,
        mode: "upsert",
        context: { uid: opts2?.uid }
      });
    }
  };

  return engine;
}
