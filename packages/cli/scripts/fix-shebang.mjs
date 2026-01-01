// packages/cli/scripts/fix-shebang.mjs
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("dist/index.js");
if (!fs.existsSync(file)) process.exit(0);

const raw = fs.readFileSync(file, "utf-8");
if (raw.startsWith("#!")) process.exit(0);

fs.writeFileSync(file, "#!/usr/bin/env node\n" + raw, "utf-8");
fs.chmodSync(file, 0o755);
