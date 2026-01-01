// demo-vite/src/persistx.ts
import { createPersistx, createInMemoryRegistry } from "@persistx/core";
import { createMemoryAdapter } from "./persistx-demo-adapter";

type SchemaFile = { persistx: number; definitions: any[] };

export async function makePersistx() {
    const res = await fetch("/schema.json");
    if (!res.ok) throw new Error("Missing /schema.json in public");

    const schema = (await res.json()) as SchemaFile;
    if (!schema?.definitions || !Array.isArray(schema.definitions)) {
        throw new Error("Invalid schema.json format. Expected { definitions: [...] }");
    }

    const registry = createInMemoryRegistry(schema.definitions);
    const adapter = createMemoryAdapter();

    const persistx = createPersistx({ adapter, registry });

    return { persistx, adapter };
}
