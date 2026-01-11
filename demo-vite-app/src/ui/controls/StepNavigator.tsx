// src/ui/controls/StepNavigator.tsx

import { useTutorial } from "../../tutorial/TutorialContext";
import Button from "../common/Button";

/**
 * StepNavigator
 * - Shows current story + step
 * - Provides Back / Next
 * - Shows step dots (click to jump within the current story)
 *
 * NOTE:
 * For Phase 1 we keep navigation within the active story (simple + safe).
 * Cross-story jumping can be added later once the UX is tuned.
 */

export default function StepNavigator() {
    const { state, story, step, actions, isFirstStep, isLastStep } = useTutorial();

    const total = story.steps.length;
    const idx = state.currentStepIndex;

    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-500">Current</div>
                <div className="truncate text-sm font-semibold text-zinc-900">
                    {story.title} — <span className="font-black">{step.title}</span>
                </div>
                {step.hint ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{step.hint}</div>
                ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from({ length: total }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={[
                                "h-2.5 w-2.5 rounded-full border transition",
                                i === idx
                                    ? "border-zinc-900 bg-zinc-900"
                                    : "border-zinc-300 bg-zinc-200 hover:bg-zinc-300"
                            ].join(" ")}
                            onClick={() => actions.goToStep?.(i)}
                            // If goToStep isn't available yet in context actions, disable clicking.
                            disabled={!actions.goToStep}
                            title={`Step ${i + 1}`}
                            aria-label={`Go to step ${i + 1}`}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={actions.goBack}
                        disabled={state.isBusy || isFirstStep}
                    >
                        Back
                    </Button>

                    <Button
                        variant="primary"
                        onClick={actions.goNext}
                        disabled={state.isBusy || isLastStep}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
