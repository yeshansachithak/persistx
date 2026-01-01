// demo-vite/src/persistx-demo-adapter.ts
import type { PersistxAdapter, PersistxAdapterSaveRequest, PersistxSaveResult } from "@persistx/core";

type Db = Record<string, Record<string, any>>; // collection -> id -> doc

export function createMemoryAdapter(db: Db = {}): PersistxAdapter & { _db: Db } {
    return {
        _db: db,

        async save(req: PersistxAdapterSaveRequest): Promise<PersistxSaveResult> {
            const col = (db[req.collection] ??= {});
            const id = req.idStrategy.kind === "fixed"
                ? req.idStrategy.id
                : crypto.randomUUID();

            if (req.mode === "create" && col[id]) throw new Error("Document exists");
            if (req.mode === "update" && !col[id]) throw new Error("Document not found");

            const existing = col[id] ?? {};
            col[id] = req.mode === "upsert" ? { ...existing, ...req.data } : { ...existing, ...req.data };

            return {
                collection: req.collection,
                id,
                mode: req.mode,
                schemaVersion: req.schemaVersion,
                savedAt: new Date().toISOString()
            };
        }
    };
}
