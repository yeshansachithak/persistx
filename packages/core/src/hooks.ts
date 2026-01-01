// packages/core/src/hooks.ts
import type { PersistxFormDefinition } from "./form-definition.js";
import type { PersistxMode, PersistxSaveRequest, PersistxSaveResult } from "./types.js";

export type PersistxHookKey =
    | "beforeValidate"
    | "afterValidate"
    | "beforeNormalize"
    | "afterNormalize"
    | "beforeMap"
    | "afterMap"
    | "beforeSave"
    | "afterSave";

export type PersistxHookContext = {
    formKey: string;
    schemaVersion: number;
    mode: PersistxMode;
    uid?: string;
    nowISO: string;

    save?: (req: PersistxSaveRequest<Record<string, unknown>>) => Promise<PersistxSaveResult>;
};

export type PersistxHookInput = {
    def: PersistxFormDefinition;
    context: PersistxHookContext;

    payload: Record<string, unknown>;
    normalized?: Record<string, unknown>;
    mapped?: Record<string, unknown>;

    result?: {
        collection: string;
        id: string;
        savedAt: string;
    };
};

export type PersistxHookHandler = (input: PersistxHookInput) => Promise<void> | void;

export type PersistxHookRegistry = {
    get(name: string): PersistxHookHandler | undefined;
};

export function createHookRegistry(handlers: Record<string, PersistxHookHandler>): PersistxHookRegistry {
    return {
        get(name: string) {
            return handlers[name];
        }
    };
}
