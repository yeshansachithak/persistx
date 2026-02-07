// src/ui/common/VisualDiff.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import type { StepAction, UiPatch } from "../../tutorial/types";

type RenamePatch = {
    op: "renameField";
    from: string;
    to: string;
    label?: string;
};

type SchemaSnapshot = {
    persistx: number;
    definitions: any[];
};

function isRenamePatch(p: UiPatch | any): p is RenamePatch {
    return !!p && p.op === "renameField" && typeof p.from === "string" && typeof p.to === "string";
}

function isRenameAction(a: StepAction): a is StepAction & { kind: "applyUiPatch"; patch: RenamePatch } {
    return a.kind === "applyUiPatch" && isRenamePatch((a as any).patch);
}

function isSetSchemaAction(a: StepAction): a is StepAction & { kind: "setSchema"; schemaRef: any } {
    return a.kind === "setSchema" && !!(a as any).schemaRef;
}

function schemaLabelFromRef(ref: any): string {
    if (!ref) return "schema";
    if (typeof ref?.versionLabel === "string" && ref.versionLabel.trim()) return ref.versionLabel;
    if (ref.kind === "snapshot" && ref.file) return String(ref.file);
    if (ref.kind === "version" && typeof ref.version === "number") return `v${ref.version}`;
    return "schema";
}

function pickDef(snapshot: SchemaSnapshot | any | undefined, formKey: string) {
    const defs = snapshot?.definitions;
    if (!Array.isArray(defs)) return null;
    return defs.find((d) => d?.formKey === formKey) ?? null;
}

function getAliasesFor(def: any, canonicalKey: string): string[] {
    const fields = Array.isArray(def?.fields) ? def.fields : [];
    const f = fields.find((x: any) => x?.key === canonicalKey);
    const aliases = Array.isArray(f?.aliases) ? f.aliases.map(String) : [];
    return aliases;
}

export default function VisualDiff() {
    const { step, state } = useTutorial();

    // Step actions may be undefined in some steps
    const stepActions = step?.actions ?? [];

    // Detect rename either from a button action OR from step.enter uiPatches
    const rename = useMemo<RenamePatch | null>(() => {
        const a = stepActions.find(isRenameAction);
        if (a) return (a as any).patch as RenamePatch;

        const enterPatches = (step as any)?.enter?.uiPatches ?? [];
        if (Array.isArray(enterPatches)) {
            const rp = enterPatches.find(isRenamePatch);
            return rp ? (rp as RenamePatch) : null;
        }

        return null;
    }, [stepActions, step]);

    // Detect "upcoming schema change" from setSchema action in this step
    const schemaTarget = useMemo(() => {
        const a = stepActions.find(isSetSchemaAction);
        if (!a) return null;
        const ref = (a as any).schemaRef;
        const file = ref?.kind === "snapshot" ? String(ref.file ?? "") : "";
        const label = schemaLabelFromRef(ref);
        return { file, label, ref };
    }, [stepActions]);

    const currentSchemaLabel = useMemo(() => schemaLabelFromRef((state as any).schemaRef), [state]);

    // Analyze output can be on either alias name
    const analysis = (state as any).lastAnalysis ?? (state as any).analyzeOutput ?? null;

    const unknown = Array.isArray(analysis?.unknownInPayload) ? analysis.unknownInPayload : [];
    const mappedKeys = analysis?.mapped && typeof analysis.mapped === "object" ? Object.keys(analysis.mapped) : [];

    // Schema snapshot might be stored under alias name too
    const snapshot: SchemaSnapshot | undefined =
        (state as any).schemaSnapshot ?? (state as any).schemaSnapshotAlias ?? undefined;

    const formKey = (state as any).formKey ?? "petProfile";

    // If current snapshot has alias info, show it dynamically
    const aliasInfo = useMemo(() => {
        const def = pickDef(snapshot, formKey);
        if (!def) return null;

        // Try to infer canonicalKey in rename story:
        // - if rename exists, the "to" key is a likely canonical target
        // - otherwise, try common known key "type" when v3
        const canonicalKey = rename?.to ?? "type";
        const aliases = getAliasesFor(def, canonicalKey);

        if (!aliases.length) return null;

        return { canonicalKey, aliases };
    }, [snapshot, formKey, rename]);

    const shouldShow = !!rename || !!schemaTarget;
    if (!shouldShow) return null;

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold text-zinc-500">Visual Diff</div>
                    <div className="mt-0.5 text-sm font-bold text-zinc-900">What changed in this step</div>
                    <div className="mt-1 text-xs text-zinc-600">
                        Current schema:{" "}
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                            {currentSchemaLabel}
                        </span>
                    </div>
                </div>

                {schemaTarget?.label ? (
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                        Next schema: {schemaTarget.label}
                    </span>
                ) : null}
            </div>

            <div className="mt-3 grid gap-3">
                {/* UI rename */}
                {rename ? (
                    <DiffRow
                        title="UI change (rename)"
                        left={`"${rename.from}"`}
                        right={`"${rename.to}"`}
                        note="Frontend renamed a field key."
                    />
                ) : null}

                {/* Why this is dangerous (inline, only when rename exists) */}
                {rename ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="text-xs font-semibold text-amber-900">Why this is dangerous</div>
                        <ul className="mt-2 list-disc pl-5 text-xs text-amber-900/90">
                            <li>Old clients may still send <b>{rename.from}</b> while new clients send <b>{rename.to}</b>.</li>
                            <li>Without explicit aliases, your DB can drift into mixed shapes (silent corruption).</li>
                            <li>PersistX forces you to be explicit so renames are reviewable and reversible.</li>
                        </ul>
                    </div>
                ) : null}

                {/* Schema change details */}
                {schemaTarget ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="text-xs font-semibold text-zinc-700">Schema change</div>

                        {/* If alias exists in the currently loaded snapshot, explain it from real data */}
                        {aliasInfo ? (
                            <div className="mt-1 text-xs text-zinc-600">
                                Canonical key is <b>{aliasInfo.canonicalKey}</b>, schema also accepts aliases:{" "}
                                {aliasInfo.aliases.map((a) => (
                                    <span
                                        key={a}
                                        className="ml-1 inline-flex rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                    >
                                        {a}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-1 text-xs text-zinc-600">
                                Schema snapshot will switch: <span className="font-mono">{schemaTarget.file || schemaTarget.label}</span>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Impact (if Analyze run) */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-xs font-semibold text-zinc-700">Impact (from Analyze)</div>

                    {analysis ? (
                        <div className="mt-2 grid gap-2">
                            <KeyList
                                label="Unknown keys (blocked by schema)"
                                keys={unknown}
                                emptyText="None"
                                tone="danger"
                            />
                            <KeyList
                                label="Mapped keys (what PersistX will store)"
                                keys={mappedKeys}
                                emptyText="No mapped output."
                                tone="ok"
                            />
                        </div>
                    ) : (
                        <div className="mt-1 text-xs text-zinc-600">
                            Run <b>Analyze</b> to see what gets blocked vs mapped.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DiffRow({
    title,
    left,
    right,
    note,
}: {
    title: string;
    left: string;
    right: string;
    note?: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="text-xs font-semibold text-zinc-700">{title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-800">
                    {left}
                </span>
                <span className="text-zinc-400">→</span>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-900">
                    {right}
                </span>
            </div>
            {note ? <div className="mt-1 text-xs text-zinc-500">{note}</div> : null}
        </div>
    );
}

function KeyList({
    label,
    keys,
    emptyText,
    tone,
}: {
    label: string;
    keys: string[];
    emptyText: string;
    tone: "danger" | "ok";
}) {
    const pill =
        tone === "danger"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900";

    return (
        <div>
            <div className="text-[11px] font-semibold text-zinc-600">{label}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
                {keys.length ? (
                    keys.map((k) => (
                        <span
                            key={k}
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pill}`}
                        >
                            {k}
                        </span>
                    ))
                ) : (
                    <span className="text-xs text-zinc-500">{emptyText}</span>
                )}
            </div>
        </div>
    );
}
