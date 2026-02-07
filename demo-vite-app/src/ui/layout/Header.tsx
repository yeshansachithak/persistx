// src/ui/layout/Header.tsx

import { useMemo, useState } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import { Globe, Github, Copy, Share2, RotateCcw } from "lucide-react";

/**
 * App header for the PersistX Interactive Tutorial.
 *
 * UX rule (teach-first):
 * - Header = Product chrome only (PersistX + tutorial title/description)
 * - Story/step context lives in TutorialControls
 *
 * Tailwind-only UI.
 */
export default function Header() {
    const { state } = useTutorial();

    // If you want this dynamic later, read from package.json at build time.
    const version = "v0.1.0";

    const [toast, setToast] = useState<string>("");

    const demoUrl = useMemo(() => {
        // Works on GH Pages + local dev
        try {
            return window.location.href;
        } catch {
            return "";
        }
    }, []);

    async function copyLink() {
        if (!demoUrl) return;
        await navigator.clipboard.writeText(demoUrl);
        showToast("Link copied");
    }

    async function share() {
        if (!demoUrl) return;

        // Use native share if available; fallback to copy.
        const navAny: any = navigator;
        if (navAny?.share) {
            try {
                await navAny.share({
                    title: "PersistX Demo",
                    text: "PersistX Interactive Tutorial",
                    url: demoUrl
                });
                showToast("Share opened");
                return;
            } catch {
                // user cancelled or failed -> fallback to copy
            }
        }

        await copyLink();
    }

    function startOver() {
        // Guaranteed reset without relying on engine internals
        window.location.reload();
    }

    function showToast(msg: string) {
        setToast(msg);
        window.clearTimeout((showToast as any)._t);
        (showToast as any)._t = window.setTimeout(() => setToast(""), 1600);
    }

    return (
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Product + tutorial meta */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold uppercase tracking-wide text-zinc-500">
                                PersistX · Interactive Tutorial
                            </div>

                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                                {version}
                            </span>
                        </div>

                        <h1 className="mt-1 truncate text-xl font-black tracking-tight text-zinc-900">
                            {state.tutorial.title}
                        </h1>

                        {state.tutorial.description ? (
                            <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">
                                {state.tutorial.description}
                            </p>
                        ) : null}
                    </div>

                    {/* Right: actions + links */}
                    <div className="flex items-center gap-2 sm:justify-end">
                        {/* Primary-ish: Start over */}
                        <IconButton
                            title="Start over"
                            onClick={startOver}
                            ariaLabel="Start over"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </IconButton>

                        {/* Share / Copy */}
                        <IconButton
                            title="Share demo"
                            onClick={share}
                            ariaLabel="Share demo"
                        >
                            <Share2 className="h-4 w-4" />
                        </IconButton>

                        <IconButton
                            title="Copy link"
                            onClick={copyLink}
                            ariaLabel="Copy link"
                        >
                            <Copy className="h-4 w-4" />
                        </IconButton>

                        <span className="mx-1 hidden h-6 w-px bg-zinc-200 sm:inline-block" />

                        {/* External links */}
                        <a
                            href="https://www.yeshanperera.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                            title="Author website"
                        >
                            <Globe className="h-4 w-4" />
                        </a>

                        <a
                            href="https://github.com/yeshansachithak"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                            title="GitHub"
                        >
                            <Github className="h-4 w-4" />
                        </a>
                    </div>
                </div>

                {/* Tiny toast */}
                {toast ? (
                    <div className="mt-3 flex justify-end">
                        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
                            {toast}
                        </div>
                    </div>
                ) : null}
            </div>
        </header>
    );
}

function IconButton({
    children,
    title,
    onClick,
    ariaLabel,
}: {
    children: React.ReactNode;
    title: string;
    onClick: () => void | Promise<void>;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={ariaLabel}
            className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98]"
        >
            {children}
        </button>
    );
}
