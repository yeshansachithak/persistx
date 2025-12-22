// package/core/src/index.ts
export * from "./form-definition.js";
export * from "./registry.js";
export * from "./mapper.js";
export * from "./validation.js";

export * from "./definition-errors.js";
export * from "./definition-loader.js";
export * from "./normalize.js";
export * from "./hooks.js";

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

export type PersistxMode = "create" | "update" | "upsert";

export type PersistxSaveRequest<TPayload = unknown> = {
  formKey: string;
  schemaVersion: number;
  mode: PersistxMode;

  /** optional override (definition is authoritative, this is for advanced usage/testing) */
  doc?: {
    collection?: string;
    id?: string;
  };

  payload: TPayload;

  context?: {
    uid?: string;
    nowISO?: string;
  };
};

export type PersistxSaveResult = {
  collection: string;
  id: string;
  mode: PersistxMode;
  schemaVersion: number;
  savedAt: string;
};

/** ✅ Explicit adapter request type */
export type PersistxAdapterSaveRequest = {
  collection: string;
  idStrategy: { kind: "auto" } | { kind: "fixed"; id: string };
  mode: PersistxMode;
  data: Record<string, unknown>;
  schemaVersion: number;
};

export type PersistxAdapter = {
  save(request: PersistxAdapterSaveRequest): Promise<PersistxSaveResult>;
};

export type PersistxEngine = {
  save(req: PersistxSaveRequest<Record<string, unknown>>): Promise<PersistxSaveResult>;
};

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
  return {
    async save(req) {
      const def = opts.registry.get(req.formKey, req.schemaVersion);
      if (!def) throw new DefinitionNotFoundError(req.formKey, req.schemaVersion);

      const nowISO = req.context?.nowISO ?? new Date().toISOString();
      const hookContext: PersistxHookContext = {
        formKey: req.formKey,
        schemaVersion: req.schemaVersion,
        mode: req.mode,
        uid: req.context?.uid,
        nowISO
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

      // validate
      const validation = validatePayload(def, payload);
      if (!validation.ok) {
        throw new ValidationFailedError("Validation failed", {
          errors: validation.errors,
          formKey: req.formKey,
          version: req.schemaVersion
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

      // normalize
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeNormalize") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const normalized = normalizePayload(payload, opts.normalize);

      for (const h of def.hooks ?? []) {
        if (h.key !== "afterNormalize") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      // map
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeMap") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const data = mapPayload(def, normalized);

      for (const h of def.hooks ?? []) {
        if (h.key !== "afterMap") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized, mapped: data }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const collection = req.doc?.collection ?? def.collection;

      // doc id strategy
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
            if (!uid) throw new Error(`docIdStrategy.uid requires context.uid`);
            idStrategy = { kind: "fixed", id: uid };
            break;
          }
        }
      } catch (e: any) {
        throw new DocIdResolutionError(e?.message ?? String(e), {
          formKey: req.formKey,
          version: req.schemaVersion
        });
      }

      const mode = req.mode ?? def.writeMode;

      // hooks: beforeSave
      for (const h of def.hooks ?? []) {
        if (h.key !== "beforeSave") continue;
        const fn = opts.hooks?.get(h.name);
        if (!fn) continue;
        try { await fn({ def, context: hookContext, payload, normalized, mapped: data }); }
        catch (e: any) { throw new HookFailedError(h.name, e?.message ?? String(e)); }
      }

      const result = await opts.adapter.save({
        collection,
        idStrategy,
        mode,
        data,
        schemaVersion: req.schemaVersion
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
    }
  };
}