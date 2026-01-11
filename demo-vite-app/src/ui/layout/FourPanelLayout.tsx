// src/ui/layout/FourPanelLayout.tsx

import React from "react";

/**
 * Fixed 4-panel layout used by the PersistX Interactive Tutorial.
 *
 * Mental model (left → right):
 *   A: UI      — What the user edits (form / payload)
 *   B: Code    — What the developer writes (persistx.submit / CLI)
 *   C: Schema  — The contract (current schema snapshot)
 *   D: Result  — What actually happened (success / error / DB)
 *
 * This component is intentionally dumb:
 * - No tutorial logic
 * - No PersistX imports
 * - Pure layout + responsive behavior
 */

type FourPanelLayoutProps = {
    a: React.ReactNode;
    b: React.ReactNode;
    c: React.ReactNode;
    d: React.ReactNode;
};

export default function FourPanelLayout({ a, b, c, d }: FourPanelLayoutProps) {
    return (
        <div className="grid gap-4 lg:grid-cols-12">
            {/* Panel A — UI */}
            <section className="lg:col-span-3">
                <PanelShell title="UI Form">
                    {a}
                </PanelShell>
            </section>

            {/* Panel B — Code */}
            <section className="lg:col-span-3">
                <PanelShell title="Code">
                    {b}
                </PanelShell>
            </section>

            {/* Panel C — Schema */}
            <section className="lg:col-span-3">
                <PanelShell title="Schema">
                    {c}
                </PanelShell>
            </section>

            {/* Panel D — Result */}
            <section className="lg:col-span-3">
                <PanelShell title="Result">
                    {d}
                </PanelShell>
            </section>
        </div>
    );
}

/**
 * Small shared shell for each panel.
 * Keeps visuals consistent without leaking semantics.
 */
function PanelShell({
    title,
    children
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900">
                {title}
            </div>
            <div className="flex-1 overflow-auto px-4 py-3">
                {children}
            </div>
        </div>
    );
}
