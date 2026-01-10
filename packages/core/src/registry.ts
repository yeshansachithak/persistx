// packages/core/src/registry.ts
import type { PersistxFormDefinition } from "./form-definition.js";

export type FormKey = string;

export type PersistxFormRegistry = {
    get(formKey: FormKey, version: number): PersistxFormDefinition | undefined;
    getLatest(formKey: FormKey): PersistxFormDefinition | undefined;
    getLatestVersion(formKey: FormKey): number | undefined;
};

export function createInMemoryRegistry(definitions: PersistxFormDefinition[]): PersistxFormRegistry {
    const map = new Map<string, PersistxFormDefinition>();
    const latestByFormKey = new Map<string, PersistxFormDefinition>();

    for (const def of definitions) {
        map.set(`${def.formKey}@${def.version}`, def);

        const cur = latestByFormKey.get(def.formKey);
        if (!cur || def.version > cur.version) {
            latestByFormKey.set(def.formKey, def);
        }
    }

    return {
        get(formKey, version) {
            return map.get(`${formKey}@${version}`);
        },
        getLatest(formKey) {
            return latestByFormKey.get(formKey);
        },
        getLatestVersion(formKey) {
            return latestByFormKey.get(formKey)?.version;
        }
    };
}
