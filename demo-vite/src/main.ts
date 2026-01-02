// demo-vite/src/main.ts
import "./style.css";
import { makePersistx } from "./persistx";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="wrap">
    <h1>PersistX Demo (Vite + TS)</h1>
    <p class="muted">
      Demonstrates schema versioning + rename aliases + safe persistence using an in-memory adapter.
    </p>

    <div class="row">
      <div>
        <label>Pet Name</label>
        <input id="petName" placeholder="Fluffy" />
      </div>

      <div>
        <label>Pet Type (legacy v1 name: <code>petType</code>)</label>
        <input id="petType" placeholder="Cat" />
      </div>

      <div>
        <label>Age</label>
        <input id="age" type="number" placeholder="3" />
      </div>
    </div>

    <div class="row">
      <div>
        <label>Send payload as</label>
        <select id="payloadMode">
          <option value="v1">Legacy payload (v1 field: petType)</option>
          <option value="v2">New payload (v2 field: type)</option>
        </select>
      </div>

      <div>
        <label>Schema version used by PersistX</label>
        <select id="schemaVersion">
          <option value="latest">Latest</option>
          <option value="1">v1</option>
          <option value="2">v2</option>
        </select>
      </div>

      <div class="buttons">
        <button id="saveBtn">Save (upsert)</button>
        <button id="seedLegacyBtn">Seed legacy payload</button>
        <button id="clearBtn">Clear DB</button>
      </div>
    </div>

    <div class="panels">
      <div class="panel">
        <h3>Output</h3>
        <pre id="out"></pre>
      </div>

      <div class="panel">
        <h3>DB Snapshot</h3>
        <pre id="db"></pre>
      </div>
    </div>

    <footer class="muted">
      Tip: run <code>persistx diff --apply</code> to add aliases when you rename fields.
    </footer>
  </div>
`;

const out = document.querySelector<HTMLPreElement>("#out")!;
const dbPre = document.querySelector<HTMLPreElement>("#db")!;
const petName = document.querySelector<HTMLInputElement>("#petName")!;
const petType = document.querySelector<HTMLInputElement>("#petType")!;
const age = document.querySelector<HTMLInputElement>("#age")!;
const saveBtn = document.querySelector<HTMLButtonElement>("#saveBtn")!;
const seedLegacyBtn = document.querySelector<HTMLButtonElement>("#seedLegacyBtn")!;
const clearBtn = document.querySelector<HTMLButtonElement>("#clearBtn")!;
const payloadMode = document.querySelector<HTMLSelectElement>("#payloadMode")!;
const schemaVersion = document.querySelector<HTMLSelectElement>("#schemaVersion")!;

(async () => {
  const { persistx, adapter } = await makePersistx();
  const db = (adapter as any)._db;

  const renderDb = () => {
    dbPre.textContent = JSON.stringify(db, null, 2);
  };

  const show = (obj: any) => {
    out.textContent = JSON.stringify(obj, null, 2);
    renderDb();
  };

  renderDb();

  saveBtn.onclick = async () => {
    out.textContent = "Saving...";
    try {
      const asMode = payloadMode.value; // v1 or v2
      const sv = schemaVersion.value;   // latest | 1 | 2

      const base = {
        petName: petName.value,
        age: age.value ? Number(age.value) : undefined
      };

      const payload =
        asMode === "v1"
          ? { ...base, petType: petType.value }       // legacy key
          : { ...base, type: petType.value };         // new key

      const result = await persistx.submit("petProfile", payload as any, {
        uid: "demo-user-001",
        schemaVersion: sv === "latest" ? undefined : Number(sv)
      });

      show({
        result,
        note: "Stored doc uses canonical keys of the chosen schema version.",
        storedDoc: db.petProfiles?.["demo-user-001"] ?? null
      });
    } catch (e: any) {
      out.textContent = `ERROR: ${e?.message ?? String(e)}`;
      renderDb();
    }
  };

  seedLegacyBtn.onclick = async () => {
    out.textContent = "Seeding legacy payload...";
    try {
      const legacyPayload = { petName: "LegacyFluff", petType: "Cat", age: 7 };

      const result = await persistx.submit("petProfile", legacyPayload as any, {
        uid: "demo-user-001"
      });

      show({
        result,
        seededPayload: legacyPayload,
        storedDoc: db.petProfiles?.["demo-user-001"] ?? null
      });
    } catch (e: any) {
      out.textContent = `ERROR: ${e?.message ?? String(e)}`;
      renderDb();
    }
  };

  clearBtn.onclick = () => {
    (adapter as any)._db.petProfiles = {};
    show({ ok: true, message: "DB cleared" });
  };
})();
