// demo-vite/src/main.ts
import "./style.css";
import { makePersistx } from "./persistx";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div style="max-width:520px;margin:24px auto;font-family:system-ui">
    <h2>PersistX Demo (Vite + TS)</h2>

    <label>Pet Name</label>
    <input id="petName" placeholder="Fluffy" />

    <label>Pet Type</label>
    <input id="petType" placeholder="Cat" />

    <label>Age</label>
    <input id="age" type="number" placeholder="3" />

    <button id="saveBtn">Save (upsert)</button>

    <pre id="out" style="margin-top:16px;background:#111;color:#0f0;padding:12px;border-radius:8px;overflow:auto"></pre>
  </div>
`;

const out = document.querySelector<HTMLPreElement>("#out")!;
const petName = document.querySelector<HTMLInputElement>("#petName")!;
const petType = document.querySelector<HTMLInputElement>("#petType")!;
const age = document.querySelector<HTMLInputElement>("#age")!;
const saveBtn = document.querySelector<HTMLButtonElement>("#saveBtn")!;

(async () => {
  const { persistx, adapter } = await makePersistx();

  saveBtn.onclick = async () => {
    out.textContent = "Saving...";

    try {
      const payload = {
        petName: petName.value,
        petType: petType.value,
        age: age.value ? Number(age.value) : undefined
      };

      const result = await persistx.submit("petProfile", payload, { uid: "demo-user-001" });

      // show stored data
      const db = (adapter as any)._db;
      out.textContent = JSON.stringify(
        { result, storedDoc: db.petProfiles?.["demo-user-001"] ?? null },
        null,
        2
      );
    } catch (e: any) {
      out.textContent = `ERROR: ${e?.message ?? String(e)}`;
    }
  };
})();
