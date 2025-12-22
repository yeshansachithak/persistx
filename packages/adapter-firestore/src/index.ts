// packages/adapter-firestore/src/index.ts
import type { PersistxAdapter, PersistxSaveResult } from "@persistx/core";

export type FirestoreAdapterOptions = {
  // later: firestore client, merge behavior, timestamps, etc.
};

export function createFirestoreAdapter(_options: FirestoreAdapterOptions): PersistxAdapter {
  return {
    async save(request): Promise<PersistxSaveResult> {
      const id = request.idStrategy.kind === "fixed" ? request.idStrategy.id : "AUTO_ID_NOT_IMPLEMENTED";

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
