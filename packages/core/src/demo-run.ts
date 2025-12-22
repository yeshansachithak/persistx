// packages/core/src/demo-run.ts
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createInMemoryRegistry } from "./registry.js";
import { createPersistx, type PersistxAdapter, type PersistxAdapterSaveRequest } from "./index.js";
import { loadDefinitions } from "./definition-loader.js";

const mockAdapter: PersistxAdapter = {
    async save(req: PersistxAdapterSaveRequest) {
        const id = req.idStrategy.kind === "fixed" ? req.idStrategy.id : "AUTO_ID";
        return {
            collection: req.collection,
            id,
            mode: req.mode,
            schemaVersion: req.schemaVersion,
            savedAt: new Date().toISOString()
        };
    }
};

async function main() {
    // Resolve repo root: packages/core/dist/demo-run.js -> go up 3 levels to repo root
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "../../../");

    const defsPath = path.join(repoRoot, "definitions", "shop_product.v1.json");

    const definitions = loadDefinitions({ kind: "jsonFile", path: defsPath });
    const registry = createInMemoryRegistry(definitions);

    const persistx = createPersistx({ adapter: mockAdapter, registry });

    const res = await persistx.save({
        formKey: "shop_product",
        schemaVersion: 1,
        mode: "upsert",
        payload: {
            sku: "SKU_ABC_001",
            name: "Wireless Mouse",
            price: 19.99,
            currency: "USD",
            category: "Accessories",
            tags: ["wireless", "usb"]
        }
    });

    console.log("Saved:", res);
    console.log("Loaded definitions from:", defsPath);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
