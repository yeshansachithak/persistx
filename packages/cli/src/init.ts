// packages/cli/src/init.ts
import fs from "node:fs";
import path from "node:path";

export async function runInit(opts: { file: string; force: boolean }) {
    const fileAbs = path.resolve(process.cwd(), opts.file);

    if (fs.existsSync(fileAbs) && !opts.force) {
        throw new Error(`Schema file already exists: ${fileAbs} (use --force to overwrite)`);
    }

    fs.mkdirSync(path.dirname(fileAbs), { recursive: true });

    const schema = {
        persistx: 1,
        definitions: [
            // =========================
            // petProfile v1
            // =========================
            {
                formKey: "petProfile",
                version: 1,
                collection: "petProfiles",
                docIdStrategy: { kind: "uid" },
                writeMode: "upsert",
                allowUnknownFields: false,
                fields: [
                    { key: "petName", type: "string", rules: [{ kind: "required" }] },
                    { key: "petType", type: "string", rules: [{ kind: "required" }] },
                    { key: "age", type: "number", nullable: true }
                ]
            },

            // =========================
            // petProfile v2 (petType renamed -> type)
            // =========================
            {
                formKey: "petProfile",
                version: 2,
                collection: "petProfiles",
                docIdStrategy: { kind: "uid" },
                writeMode: "upsert",
                allowUnknownFields: false,
                fields: [
                    { key: "petName", type: "string", rules: [{ kind: "required" }] },

                    // renamed field
                    { key: "type", type: "string", rules: [{ kind: "required" }] },

                    { key: "age", type: "number", nullable: true }
                ]
            },

            // =========================
            // profile v1
            // =========================
            {
                formKey: "profile",
                version: 1,
                collection: "profiles",
                docIdStrategy: { kind: "uid" },
                writeMode: "upsert",
                allowUnknownFields: false,
                fields: [
                    { key: "firstName", type: "string", rules: [{ kind: "required" }] },
                    { key: "lastName", type: "string", rules: [{ kind: "required" }] },
                    { key: "phoneNumber", type: "string", nullable: true }
                ]
            },

            // =========================
            // profile v2 (phoneNumber -> phone)
            // =========================
            {
                formKey: "profile",
                version: 2,
                collection: "profiles",
                docIdStrategy: { kind: "uid" },
                writeMode: "upsert",
                allowUnknownFields: false,
                fields: [
                    { key: "firstName", type: "string", rules: [{ kind: "required" }] },
                    { key: "lastName", type: "string", rules: [{ kind: "required" }] },

                    // renamed field
                    { key: "phone", type: "string", nullable: true }
                ]
            }
        ]
    };

    fs.writeFileSync(fileAbs, JSON.stringify(schema, null, 2) + "\n", "utf-8");
    console.log(`✅ created: ${fileAbs}`);
}
