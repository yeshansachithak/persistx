import type { PersistxAdapter, PersistxSaveRequest, PersistxSaveResult } from "@persistx/core";

export type FirestoreAdapterOptions = {
  // We'll define this later (Firestore client, timestamp strategy, merge behavior, etc.)
};

export function createFirestoreAdapter(_options: FirestoreAdapterOptions): PersistxAdapter {
  return {
    async save(request: PersistxSaveRequest): Promise<PersistxSaveResult> {
      // Placeholder – we’ll implement after core contracts are finalized.
      // This stub allows consumers to compile while we build incrementally.
      const id = request.doc.id ?? "AUTO_ID_NOT_IMPLEMENTED";

      return {
        collection: request.doc.collection,
        id,
        mode: request.mode,
        schemaVersion: request.schemaVersion,
        savedAt: new Date().toISOString()
      };
    }
  };
}
