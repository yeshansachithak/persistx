// packages/core/src/form-definition.ts
import type { PersistxHookKey } from "./hooks.js";

export type PersistxPrimitive = "string" | "number" | "boolean" | "date" | "object" | "array";

export type PersistxFieldRule =
    | { kind: "required"; message?: string }
    | { kind: "min"; value: number; message?: string }
    | { kind: "max"; value: number; message?: string }
    | { kind: "regex"; value: string; message?: string };

export type PersistxFieldDefinition = {
    /** Incoming payload key (UI field name) */
    key: string;

    /**
     * Additional incoming payload keys that should be treated as the same field.
     * Used for safe renames across versions (ex: myPetName -> my_pet_name).
     */
    aliases?: string[];

    /** Expected data type */
    type: PersistxPrimitive;

    /** Dot-path to store in document. Defaults to `key`. */
    path?: string;

    /** Allow null / empty values */
    nullable?: boolean;

    /** Validation rules */
    rules?: PersistxFieldRule[];

    /** Ignore field completely */
    ignore?: boolean;
};

export type PersistxDocIdStrategy =
    | { kind: "uid" }
    | { kind: "payload"; key: string }
    | { kind: "fixed"; id: string }
    | { kind: "auto" };

export type PersistxWriteMode = "create" | "update" | "upsert";

export type PersistxHookRef = {
    key: PersistxHookKey;
    name: string;
    config?: Record<string, unknown>;
};

export type PersistxFormDefinition = {
    formKey: string;
    version: number;
    collection: string;
    docIdStrategy: PersistxDocIdStrategy;
    writeMode: PersistxWriteMode;
    fields: PersistxFieldDefinition[];

    /** If false, reject payload keys not declared in `fields` (including aliases) */
    allowUnknownFields?: boolean;

    hooks?: PersistxHookRef[];

    meta?: {
        title?: string;
        description?: string;
        tags?: string[];
    };
};
