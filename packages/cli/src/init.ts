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
            {
                formKey: "exampleForm",
                version: 1,
                collection: "exampleForms",
                docIdStrategy: { kind: "uid" },
                writeMode: "upsert",
                allowUnknownFields: false,
                fields: [
                    { key: "name", type: "string", rules: [{ kind: "required" }] },
                    { key: "age", type: "number", nullable: true }
                ]
            }
        ]
    };

    fs.writeFileSync(fileAbs, JSON.stringify(schema, null, 2) + "\n", "utf-8");
    console.log(`✅ created: ${fileAbs}`);
}
