export type PersistxMode = "create" | "update" | "upsert";

export type PersistxSaveRequest<TPayload = unknown> = {
  formKey: string;
  schemaVersion: number;
  mode: PersistxMode;
  doc: {
    collection: string;
    id?: string; // optional for auto-id strategies
  };
  payload: TPayload;
};

export type PersistxSaveResult = {
  collection: string;
  id: string;
  mode: PersistxMode;
  schemaVersion: number;
  savedAt: string; // ISO
};

export type PersistxAdapter = {
  save(request: PersistxSaveRequest): Promise<PersistxSaveResult>;
};

export function createPersistx(adapter: PersistxAdapter) {
  return {
    save: (request: PersistxSaveRequest) => adapter.save(request)
  };
}
