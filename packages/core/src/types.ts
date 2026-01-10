// packages/core/src/types.ts

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
    formKey?: string; // for audit
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
    submit(
        formKey: string,
        payload: Record<string, unknown>,
        opts?: { uid?: string; mode?: PersistxMode; schemaVersion?: number }
    ): Promise<PersistxSaveResult>;

    create(
        formKey: string,
        payload: Record<string, unknown>,
        opts?: { uid?: string; schemaVersion?: number }
    ): Promise<PersistxSaveResult>;

    update(
        formKey: string,
        payload: Record<string, unknown>,
        opts?: { uid?: string; schemaVersion?: number }
    ): Promise<PersistxSaveResult>;

    upsert(
        formKey: string,
        payload: Record<string, unknown>,
        opts?: { uid?: string; schemaVersion?: number }
    ): Promise<PersistxSaveResult>;
};
