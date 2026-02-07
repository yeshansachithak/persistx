// src/ui/layout/Header.tsx

import { useTutorial } from "../../tutorial/TutorialContext";

/**
 * App header for the PersistX Interactive Tutorial.
 *
 * UX rule (teach-first):
 * - Header = Product chrome only (PersistX + tutorial title/description)
 * - Story/step context lives in TutorialControls (so we don't repeat it)
 */
export default function Header() {
    const { state } = useTutorial();

    return (
        <header className="border-b border-zinc-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Product + tutorial meta */}
                    <div className="min-w-0">
                        <div className="text-lg font-semibold uppercase tracking-wide text-zinc-500">
                            PersistX - Interactive Tutorials
                        </div>

                        <h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-zinc-900">
                            {state.tutorial.title}
                        </h1>

                        {state.tutorial.description ? (
                            <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">
                                {state.tutorial.description}
                            </p>
                        ) : null}
                    </div>

                    {/* Right: reserved for future (tutorial picker, links, version, etc.) */}
                    <div className="hidden sm:block text-right text-xs text-zinc-500">
                        {/* intentionally empty */}
                    </div>
                </div>
            </div>
        </header>
    );
}
