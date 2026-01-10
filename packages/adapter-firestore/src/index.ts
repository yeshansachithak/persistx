// packages/adapter-firestore/src/index.ts
import type { PersistxAdapter, PersistxAdapterSaveRequest, PersistxSaveResult } from "@persistx/core";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export type FirestoreAdapterOptions = {
  firestore: Firestore;

  /** default: true (uses set(..., { merge: true }) for upsert/update behavior where applicable) */
  merge?: boolean;

  /** default: true (writes _persistx metadata) */
  audit?: boolean;

  /** default: "_persistx" */
  auditField?: string;

  /** default: true (writes updatedAt, and createdAt for create) */
  timestamps?: boolean;

  /** default: "createdAt" */
  createdAtField?: string;

  /** default: "updatedAt" */
  updatedAtField?: string;
};

type PersistxAudit = {
  formKey?: string;
  schemaVersion: number;
  mode: string;
  savedAt: unknown;
};

function withAuditAndTimestamps(
  req: PersistxAdapterSaveRequest,
  opts: Required<
    Pick<FirestoreAdapterOptions, "audit" | "auditField" | "timestamps" | "createdAtField" | "updatedAtField">
  >
) {
  const data: Record<string, unknown> = { ...req.data };

  if (opts.timestamps) {
    data[opts.updatedAtField] = FieldValue.serverTimestamp();
    if (req.mode === "create") {
      data[opts.createdAtField] = FieldValue.serverTimestamp();
    }
  }

  if (opts.audit) {
    const audit: PersistxAudit = {
      formKey: req.formKey, // ✅ NEW
      schemaVersion: req.schemaVersion,
      mode: req.mode,
      savedAt: FieldValue.serverTimestamp()
    };
    data[opts.auditField] = audit;
  }

  return data;
}

export function createFirestoreAdapter(options: FirestoreAdapterOptions): PersistxAdapter {
  const merge = options.merge ?? true;

  const audit = options.audit ?? true;
  const auditField = options.auditField ?? "_persistx";

  const timestamps = options.timestamps ?? true;
  const createdAtField = options.createdAtField ?? "createdAt";
  const updatedAtField = options.updatedAtField ?? "updatedAt";

  const optResolved = { audit, auditField, timestamps, createdAtField, updatedAtField };

  return {
    async save(request: PersistxAdapterSaveRequest): Promise<PersistxSaveResult> {
      const col = options.firestore.collection(request.collection);

      // Resolve doc ref + id
      let docRef;
      if (request.idStrategy.kind === "fixed") {
        docRef = col.doc(request.idStrategy.id);
      } else {
        // auto id
        if (request.mode === "update") {
          throw new Error(`Firestore adapter: mode "update" cannot use idStrategy.auto`);
        }
        docRef = col.doc(); // generates id
      }

      const id = docRef.id;
      const data = withAuditAndTimestamps(request, optResolved);

      // Execute write based on mode
      if (request.mode === "create") {
        await docRef.create(data);
      } else if (request.mode === "update") {
        await docRef.update(data);
      } else {
        await docRef.set(data, { merge });
      }

      return {
        collection: request.collection,
        id,
        mode: request.mode,
        schemaVersion: request.schemaVersion,
        savedAt: new Date().toISOString()
      };
    }
  };
}
