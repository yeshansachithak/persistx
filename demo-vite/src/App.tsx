// demo-vite/src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createDemoPersistx } from "./persistxClient";

type EngineState = Awaited<ReturnType<typeof createDemoPersistx>>;

const samples: Record<string, any> = {
  "petProfile v1 (legacy + unknown)": {
    petName: "Fluffy",
    petType: "Cat",
    age: 3,
    extraFieldShouldDrop: "lol"
  },
  "petProfile v2 (canonical)": {
    petName: "Fluffy",
    type: "Cat",
    age: 3
  },
  "profile v1 (unknown)": {
    firstName: "Yeshan",
    lastName: "Perera",
    phoneNumber: "+94 77 123 4567",
    unknownX: "shouldDropOrGoToUnknown"
  }
};

function pretty(x: any) {
  return JSON.stringify(x, null, 2);
}

export default function App() {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [err, setErr] = useState<string>("");

  const [formKey, setFormKey] = useState("petProfile");
  const [schemaVersion, setSchemaVersion] = useState<"latest" | "1" | "2">("latest");
  const [uid, setUid] = useState("demo-user-001");

  const [payloadText, setPayloadText] = useState(pretty(samples["petProfile v1 (legacy + unknown)"]));

  const [analysis, setAnalysis] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  useEffect(() => {
    createDemoPersistx()
      .then(setEngine)
      .catch((e: any) => setErr(e?.message ?? String(e)));
  }, []);

  const availableFormKeys = useMemo(() => {
    if (!engine) return [];
    // registry internals aren’t exposed; we can infer from schema by reading /schema.json if needed.
    // For now: show common keys (demo-friendly). You can expand later.
    return ["petProfile", "profile"];
  }, [engine]);

  const numericVersion = schemaVersion === "latest" ? undefined : Number(schemaVersion);

  const parsePayload = (): Record<string, unknown> => {
    const obj = JSON.parse(payloadText);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new Error("Payload must be a JSON object");
    }
    return obj as Record<string, unknown>;
  };

  const runAnalyze = () => {
    if (!engine) return;
    setErr("");
    setSubmitResult(null);
    try {
      const payload = parsePayload();
      const out = engine.analyze(formKey, payload, numericVersion);
      setAnalysis(out);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setAnalysis(null);
    }
  };

  const runSubmit = async () => {
    if (!engine) return;
    setErr("");
    setAnalysis(null);
    setSubmitResult(null);

    try {
      const payload = parsePayload();
      const result = await engine.persistx.submit(formKey as any, payload as any, {
        uid,
        schemaVersion: numericVersion
      });

      setSubmitResult({
        result,
        lastAdapterRequest: (engine.adapter as any)._last ?? null,
        db: (engine.adapter as any)._db ?? null
      });
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const clearDb = () => {
    if (!engine) return;
    (engine.adapter as any)._db = {};
    (engine.adapter as any)._last = undefined;
    setSubmitResult({
      ok: true,
      message: "DB cleared",
      db: (engine.adapter as any)._db
    });
  };

  if (err && !engine) {
    return (
      <div style={{ padding: 16 }}>
        <h2>PersistX Demo</h2>
        <pre style={{ color: "crimson" }}>{err}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>PersistX Demo</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        Learn: validate → normalize → map (aliases + drop unknown) → submit (adapter.save)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label>formKey</label>
          <select value={formKey} onChange={(e) => setFormKey(e.target.value)} style={{ width: "100%" }}>
            {availableFormKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>schemaVersion</label>
          <select value={schemaVersion} onChange={(e) => setSchemaVersion(e.target.value as any)} style={{ width: "100%" }}>
            <option value="latest">latest</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>

        <div>
          <label>context.uid (used by docIdStrategy.uid)</label>
          <input value={uid} onChange={(e) => setUid(e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 12 }}>
        <div>
          <label>Payload JSON</label>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={10}
            style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={runAnalyze}>Analyze (validate + normalize + map)</button>
          <button onClick={runSubmit}>Submit (engine.submit → adapter.save)</button>
          <button onClick={clearDb}>Clear DB</button>

          <span style={{ marginLeft: 8, opacity: 0.7 }}>Load sample:</span>
          <select
            onChange={(e) => setPayloadText(pretty(samples[e.target.value]))}
            defaultValue="petProfile v1 (legacy + unknown)"
          >
            {Object.keys(samples).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {err ? <pre style={{ color: "crimson", margin: 0 }}>{err}</pre> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Analyze Output</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{analysis ? pretty(analysis) : "Run Analyze to see validate/normalize/map."}</pre>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Submit Output</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {submitResult ? pretty(submitResult) : "Run Submit to see adapter request + stored DB snapshot."}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: 16, opacity: 0.7 }}>
        Tip: Try payload with <code>petType</code> while schemaVersion is latest/v2. You should see it mapped into canonical{" "}
        <code>type</code>. Unknown keys should appear in <code>unknownInPayload</code> and disappear from <code>mapped</code>.
      </div>
    </div>
  );
}
