// src/ui/layout/FourPanelLayout.tsx

import React from "react";

/**
 * Two-row tutorial layout (Phase 1 UX upgrade).
 *
 * Row 1 (learning loop):
 *   UI Form  →  Schema Contract  →  Result
 *
 * Row 2 (developer proof):
 *   Code (full width)
 *
 * Goal:
 * - Row 1 should NOT feel tall / stretched.
 * - Panels should size to content, with sensible max-heights + internal scroll.
 */

type FourPanelLayoutProps = {
    a: React.ReactNode; // UI
    b: React.ReactNode; // Code
    c: React.ReactNode; // Schema
    d: React.ReactNode; // Result
};

export default function FourPanelLayout({ a, b, c, d }: FourPanelLayoutProps) {
    return (
        <div className="grid gap-4">
            {/* Row 1: UI + Schema + Result (do NOT stretch) */}
            <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                <section className="lg:col-span-4">
                    <PanelShell title="UI Form" meta="Input" variant="top">
                        {a}
                    </PanelShell>
                </section>

                <section className="lg:col-span-4">
                    <PanelShell title="Schema Contract" meta="Contract" variant="top">
                        {c}
                    </PanelShell>
                </section>

                <section className="lg:col-span-4">
                    <PanelShell title="Result" meta="Output" variant="top">
                        {d}
                    </PanelShell>
                </section>
            </div>

            {/* Row 2: Code (full width) */}
            <section>
                <PanelShell title="Developer View" meta="Code" variant="bottom">
                    {b}
                </PanelShell>
            </section>
        </div>
    );
}

function PanelShell({
    title,
    meta,
    variant = "top",
    children
}: {
    title: string;
    meta?: string;
    variant?: "top" | "bottom";
    children: React.ReactNode;
}) {
    // Top row should be tighter; bottom row can be taller.
    const bodyMax =
        variant === "top"
            ? "max-h-[42vh] lg:max-h-[48vh]"
            : "max-h-[52vh] lg:max-h-[60vh]";

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2">
                <div className="min-w-0 text-sm font-semibold text-zinc-900">{title}</div>

                {meta ? (
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                        {meta}
                    </span>
                ) : null}
            </div>

            {/* IMPORTANT:
          - no flex-1 (prevents forced tall cards)
          - use max-height + internal scroll only when needed
       */}
            <div className={`overflow-auto px-4 py-3 ${bodyMax}`}>{children}</div>
        </div>
    );
}
