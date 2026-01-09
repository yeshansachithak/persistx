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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">
      {children}
    </span>
  );
}

function Card({
  title,
  subtitle,
  children,
  right
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100"
  };
  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
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
    // Demo-friendly list; you can auto-detect later if you want.
    return ["petProfile", "profile"];
  }, []);

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

  const loadSample = (key: string) => {
    setErr("");
    setAnalysis(null);
    setSubmitResult(null);
    setPayloadText(pretty(samples[key]));
  };

  return (
    <div className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">PersistX Demo</div>
            <div className="mt-1 text-sm text-zinc-600">
              Learn the pipeline: <span className="font-semibold text-zinc-900">validate → normalize → map → save</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Schema versioning</Badge>
            <Badge>Aliases / renames</Badge>
            <Badge>Unknown drop</Badge>
            <Badge>Adapter boundary</Badge>
          </div>
        </div>

        {/* Error */}
        {err ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <div className="font-semibold">Error</div>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{err}</pre>
          </div>
        ) : null}

        {/* Grid */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left: Controls */}
          <div className="lg:col-span-5">
            <Card
              title="Step 1 — Configure"
              subtitle="Pick the formKey + schema version. uid is used by docIdStrategy.id."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold text-zinc-700">formKey</span>
                  <select
                    className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                  >
                    {availableFormKeys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold text-zinc-700">schemaVersion</span>
                  <select
                    className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={schemaVersion}
                    onChange={(e) => setSchemaVersion(e.target.value as any)}
                  >
                    <option value="latest">latest</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 grid gap-1 text-sm">
                <span className="text-xs font-semibold text-zinc-700">context.uid</span>
                <input
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                />
              </label>

              <div className="mt-3 text-xs text-zinc-500">
                Tip: For <code className="rounded bg-zinc-100 px-1 py-0.5">petProfile</code>, schema v2 uses canonical{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5">type</code> with alias{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5">petType</code>.
              </div>
            </Card>

            <div className="mt-4">
              <Card
                title="Step 2 — Payload"
                subtitle="Paste JSON. Try legacy keys + unknown keys and see what PersistX does."
                right={
                  <select
                    className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
                    defaultValue="petProfile v1 (legacy + unknown)"
                    onChange={(e) => loadSample(e.target.value)}
                  >
                    {Object.keys(samples).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                }
              >
                <textarea
                  className="min-h-[240px] w-full rounded-2xl border border-zinc-200 bg-white p-3 font-mono text-xs leading-5 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                />
              </Card>
            </div>

            <div className="mt-4">
              <Card title="Step 3 — Actions" subtitle="Analyze shows the pipeline outputs. Submit calls adapter.save().">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={runAnalyze} disabled={!engine}>
                    Analyze
                  </Button>
                  <Button onClick={runSubmit} variant="secondary" disabled={!engine}>
                    Submit
                  </Button>
                  <Button onClick={clearDb} variant="ghost" disabled={!engine}>
                    Clear DB
                  </Button>
                </div>

                <div className="mt-3 text-xs text-zinc-500">
                  What to look for:
                  <ul className="mt-2 list-disc pl-5">
                    <li>
                      <span className="font-semibold text-zinc-700">unknownInPayload</span> should include extra keys like{" "}
                      <code className="rounded bg-zinc-100 px-1 py-0.5">extraFieldShouldDrop</code>.
                    </li>
                    <li>
                      <span className="font-semibold text-zinc-700">mapped</span> should use canonical keys for the chosen version.
                    </li>
                    <li>
                      <span className="font-semibold text-zinc-700">lastAdapterRequest</span> shows the exact data passed to storage.
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>

          {/* Right: Outputs */}
          <div className="lg:col-span-7">
            <div className="grid gap-4">
              <Card title="Analyze Output" subtitle="validatePayload + normalizePayload + mapPayload">
                <pre className="max-h-[360px] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-100">
                  {analysis ? pretty(analysis) : "Run Analyze to see validate/normalize/map output."}
                </pre>
              </Card>

              <Card title="Submit Output" subtitle="engine.submit → adapter.save + DB snapshot">
                <pre className="max-h-[360px] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-100">
                  {submitResult ? pretty(submitResult) : "Run Submit to see adapter request + stored DB snapshot."}
                </pre>
              </Card>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-700">
              <div className="font-semibold text-zinc-900">Suggested experiments</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-800">Alias mapping</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Use <code className="rounded bg-white px-1 py-0.5">petType</code> while schemaVersion is latest/2 and
                    confirm it becomes <code className="rounded bg-white px-1 py-0.5">type</code> in <b>mapped</b>.
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-800">Unknown drop</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Keep <code className="rounded bg-white px-1 py-0.5">extraFieldShouldDrop</code> and verify it appears in{" "}
                    <b>unknownInPayload</b> and disappears from <b>mapped</b>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">
          PersistX is a contract layer — not an ORM. Everything is explicit: versions, aliases, unknown handling, adapter writes.
        </div>
      </div>
    </div>
  );
}
