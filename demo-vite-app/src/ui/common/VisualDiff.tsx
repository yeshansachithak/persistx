// src/ui/common/VisualDiff.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import type { StepAction } from "../../tutorial/types";

type RenamePatch = {
    op: "renameField";
    from: string;
    to: string;
    label?: string;
};

function isRenameAction(a: StepAction): a is StepAction & { kind: "applyUiPatch"; patch: RenamePatch } {
    return a.kind === "applyUiPatch" && (a as any).patch?.op === "renameField";
}

function isSetSchemaAction(a: StepAction): a is StepAction & { kind: "setSchema"; schemaRef: any } {
    return a.kind === "setSchema" && !!(a as any).schemaRef;
}

export default function VisualDiff() {
    const { step, state } = useTutorial();

    const rename = useMemo(() => {
        const actions = step.actions ?? [];
        const a = actions.find(isRenameAction);
        return a ? (a as any).patch as RenamePatch : null;
    }, [step.actions]);

    const schemaTarget = useMemo(() => {
        const actions = step.actions ?? [];
        const a = actions.find(isSetSchemaAction);
        if (!a) return null;
        const ref = (a as any).schemaRef;
        // expecting snapshot file naming like schema.v3.rename-with-alias.json
        const file = ref?.kind === "snapshot" ? String(ref.file ?? "") : "";
        const label = ref?.versionLabel ? String(ref.versionLabel) : "";
        return { file, label };
    }, [step.actions]);

    const shouldShow = !!rename || !!schemaTarget;

    const unknown = state.lastAnalysis?.unknownInPayload ?? [];
    const mappedKeys = state.lastAnalysis?.mapped ? Object.keys(state.lastAnalysis.mapped) : [];

    if (!shouldShow) return null;

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold text-zinc-500">Visual Diff</div>
                    <div className="mt-0.5 text-sm font-bold text-zinc-900">What changed in this step</div>
                </div>

                {schemaTarget?.label ? (
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                        {schemaTarget.label}
                    </span>
                ) : null}
            </div>

            <div className="mt-3 grid gap-3">
                {/* UI rename */}
                {rename ? (
                    <DiffRow
                        title="UI change"
                        left={`"${rename.from}"`}
                        right={`"${rename.to}"`}
                        note="Frontend renamed a field key."
                    />
                ) : null}

                {/* Schema change (alias step) */}
                {schemaTarget ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="text-xs font-semibold text-zinc-700">Schema change</div>
                        <div className="mt-1 text-xs text-zinc-600">
                            {schemaTarget.file.includes("rename-with-alias") ? (
                                <>
                                    Canonical key is <b>type</b>, but schema also accepts alias <b>petType</b>.
                                </>
                            ) : (
                                <>
                                    Schema snapshot switched: <span className="font-mono">{schemaTarget.file}</span>
                                </>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Impact (if Analyze run) */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-xs font-semibold text-zinc-700">Impact (from Analyze)</div>

                    {state.lastAnalysis ? (
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
                                emptyText="Run Analyze to see mapped keys."
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
