// packages/core/src/demo-run.ts
import { createInMemoryRegistry } from "./registry.js";
import { createPersistx, type PersistxAdapter, type PersistxAdapterSaveRequest } from "./index.js";
import { EXAMPLE_PRODUCT_FORM_V1 } from "./examples.js";

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
    const registry = createInMemoryRegistry([EXAMPLE_PRODUCT_FORM_V1]);
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
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
