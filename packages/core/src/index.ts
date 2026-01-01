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

  /**
   * Optional now.
   * - If omitted, PersistX will use registry.getLatest(formKey)
   */
  schemaVersion?: number;

  /**
   * Optional now.
   * - If omitted, PersistX will use def.writeMode
   */
  mode?: PersistxMode;

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
  formKey?: string; // ✅ NEW (for audit)
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

  /** Junior-friendly helpers */
  submit(formKey: string, payload: Record<string, unknown>, opts?: { uid?: string; mode?: PersistxMode; schemaVersion?: number }): Promise<PersistxSaveResult>;
  create(formKey: string, payload: Record<string, unknown>, opts?: { uid?: string; schemaVersion?: number }): Promise<PersistxSaveResult>;
  update(formKey: string, payload: Record<string, unknown>, opts?: { uid?: string; schemaVersion?: number }): Promise<PersistxSaveResult>;
  upsert(formKey: string, payload: Record<string, unknown>, opts?: { uid?: string; schemaVersion?: number }): Promise<PersistxSaveResult>;
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
  // define engine first so hooks can call engine.save safely
  const engine: PersistxEngine = {
    async save(req) {
      const resolvedVersion = req.schemaVersion ?? opts.registry.getLatestVersion(req.formKey);
      if (!resolvedVersion) throw new DefinitionNotFoundError(req.formKey, req.schemaVersion ?? -1);

      const def = opts.registry.get(req.formKey, resolvedVersion);
      if (!def) throw new DefinitionNotFoundError(req.formKey, resolvedVersion);

      const nowISO = req.context?.nowISO ?? new Date().toISOString();

      // hook context: add save() for multi-collection orchestration via hooks
      const hookContext: PersistxHookContext = {
        formKey: req.formKey,
        schemaVersion: resolvedVersion,
        mode: (req.mode ?? def.writeMode) as PersistxMode,
        uid: req.context?.uid,
        nowISO,

        // ✅ allows hooks to persist additional docs via PersistX pipeline
        save: async (childReq) => {
          // childReq is intentionally lightweight to avoid strong coupling in hooks typings
          // but it still goes through the same PersistX engine pipeline.
          const r = childReq as PersistxSaveRequest<Record<string, unknown>>;
          return engine.save(r);
        }
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

      // validate (PersistX safety net)
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
        formKey: req.formKey, // ✅ pass for audit
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