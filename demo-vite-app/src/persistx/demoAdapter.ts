// src/persistx/demoAdapter.ts

import type { PersistxAdapter, PersistxAdapterSaveRequest, PersistxSaveResult } from "@persistx/core";

type Db = Record<string, Record<string, any>>; // collection -> id -> doc

export type DemoAdapter = PersistxAdapter & {
    _db: Db;
    _last?: PersistxAdapterSaveRequest;
};

/**
 * In-memory adapter used only for the interactive tutorial.
 * - Stores documents by collection + id
 * - Captures last save request for visibility (what PersistX actually sent to storage)
 */
export function createMemoryAdapter(db: Db = {}): DemoAdapter {
    return {
        _db: db,
        _last: undefined,

        async save(req: PersistxAdapterSaveRequest): Promise<PersistxSaveResult> {
            this._last = req;

            const col = (db[req.collection] ??= {});
            const id =
                req.idStrategy.kind === "fixed"
                    ? req.idStrategy.id
                    : crypto.randomUUID();

            if (req.mode === "create" && col[id]) throw new Error("Document exists");
            if (req.mode === "update" && !col[id]) throw new Error("Document not found");

            const existing = col[id] ?? {};
            col[id] = { ...existing, ...req.data };

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
