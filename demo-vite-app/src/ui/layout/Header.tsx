// src/ui/layout/Header.tsx

import { useTutorial } from "../../tutorial/TutorialContext";

/**
 * App header for the PersistX Interactive Tutorial.
 * Shows tutorial title + current story / step context.
 */
export default function Header() {
    const { state, story, step } = useTutorial();

    return (
        <header className="border-b border-zinc-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-zinc-900">
                            {state.tutorial.title}
                        </h1>
                        <p className="mt-0.5 text-sm text-zinc-600">
                            {state.tutorial.description}
                        </p>
                    </div>

                    <div className="text-sm text-zinc-700">
                        <div className="font-semibold">
                            {story.title}
                        </div>
                        <div className="text-xs text-zinc-500">
                            Step {state.currentStepIndex + 1} of {story.steps.length}:{" "}
                            <span className="font-medium text-zinc-700">{step.title}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
