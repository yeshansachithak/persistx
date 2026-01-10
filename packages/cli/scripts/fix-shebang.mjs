// packages/cli/scripts/fix-shebang.mjs
import fs from "node:fs";

const file = new URL("../dist/index.js", import.meta.url);

let txt = fs.readFileSync(file, "utf8");

// Ensure correct shebang at very top
if (txt.startsWith("#!")) {
    txt = txt.replace(/^#!.*\n/, "#!/usr/bin/env node\n");
} else {
    txt = "#!/usr/bin/env node\n" + txt;
}

fs.writeFileSync(file, txt, "utf8");

// ✅ Make it executable (fixes “Permission denied”)
fs.chmodSync(file, 0o755);
