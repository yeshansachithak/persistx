// packages/core/src/registry.ts
import type { PersistxFormDefinition } from "./form-definition.js";

export type FormKey = string;

export type PersistxFormRegistry = {
    get(formKey: FormKey, version: number): PersistxFormDefinition | undefined;
};

export function createInMemoryRegistry(definitions: PersistxFormDefinition[]): PersistxFormRegistry {
    const map = new Map<string, PersistxFormDefinition>();
    for (const def of definitions) {
        map.set(`${def.formKey}@${def.version}`, def);
    }

    return {
        get(formKey, version) {
            return map.get(`${formKey}@${version}`);
        }
    };
}
