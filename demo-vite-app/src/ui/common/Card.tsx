// src/ui/common/Card.tsx

import React from "react";

export type CardProps = {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export default function Card({ title, subtitle, right, children, className }: CardProps) {
    return (
        <div className={["rounded-2xl border border-zinc-200 bg-white shadow-sm", className].filter(Boolean).join(" ")}>
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">{title}</div>
                    {subtitle ? <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div> : null}
                </div>
                {right ? <div className="shrink-0">{right}</div> : null}
            </div>

            <div className="px-4 py-3">{children}</div>
        </div>
    );
}
