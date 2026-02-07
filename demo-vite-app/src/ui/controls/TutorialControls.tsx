// src/ui/controls/TutorialControls.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import Button from "../common/Button";
import { dispatchStepAction } from "../../tutorial/TutorialRunner";

/**
 * TutorialControls
 *
 * Single unified control bar:
 *  - Shows current story + step + hint (from StepNavigator)
 *  - Shows step dots (optional jump within story)
 *  - Shows step actions (data-driven) BUT excludes back/next from step.actions
 *  - Shows Back/Next consistently (from context navigation)
 *
 * UX rules:
 *  - Navigation is always in the same place (Back/Next on the right).
 *  - Step actions are ordered by tone: primary → secondary → danger → ghost.
 *  - Optional "Why" line uses step.explain[0] to teach the user.
 */

export default function TutorialControls() {
    const api = useTutorial();
    const { state, story, step, actions, isFirstStep, isLastStep } = api;

    const totalSteps = story.steps.length;
    const idx = state.currentStepIndex;

    const stepActions = (step.actions ?? []).filter(
        (a) => a.kind !== "next" && a.kind !== "back"
    );

    const ordered = useMemo(() => {
        const score = (tone?: any) => {
            if (tone === "primary") return 0;
            if (tone === "secondary") return 1;
            if (tone === "danger") return 2;
            return 3; // ghost / undefined
        };
        return [...stepActions].sort((a, b) => score(a.tone) - score(b.tone));
    }, [stepActions]);

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                {/* Left: Current step + hint */}
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-500">Current</div>

                    <div className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
                        {story.title} — <span className="font-black">{step.title}</span>
                    </div>

                    {step.hint ? (
                        <div className="mt-1 line-clamp-2 text-xs text-zinc-600">{step.hint}</div>
                    ) : null}

                    {/* Why line (teaching) */}
                    {step.explain?.length ? (
                        <div className="mt-2 text-xs text-zinc-600">
                            <span className="font-semibold text-zinc-700">{step.explain[0]}</span>
                            {step.explain?.length > 1 && (
                                <ul className="mt-1 list-disc pl-4">
                                    {step.explain.slice(1).map((t, i) => (
                                        <li key={i}>{t}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Right: dots + actions + nav */}
                <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                    {/* Step dots */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                className={[
                                    "h-2.5 w-2.5 rounded-full border transition",
                                    i === idx
                                        ? "border-zinc-900 bg-zinc-900"
                                        : "border-zinc-300 bg-zinc-200 hover:bg-zinc-300",
                                ].join(" ")}
                                onClick={() => actions.goToStep?.(i)}
                                disabled={!actions.goToStep || state.isBusy}
                                title={`Step ${i + 1}`}
                                aria-label={`Go to step ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {ordered.map((a) => {
                            const variant = toneToVariant(a.tone);
                            const disabled = state.isBusy;

                            return (
                                <Button
                                    key={a.id}
                                    variant={variant}
                                    onClick={() => dispatchStepAction(a as any, api as any)}
                                    disabled={disabled}
                                    title={a.help}
                                >
                                    {a.label}
                                </Button>
                            );
                        })}

                        {/* Divider (subtle) */}
                        <span className="mx-1 hidden h-6 w-px bg-zinc-200 lg:inline-block" />

                        {/* Navigation: always present, consistent */}
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
        </div>
    );
}

function toneToVariant(tone: any): "primary" | "secondary" | "danger" | "ghost" {
    switch (tone) {
        case "primary":
            return "primary";
        case "secondary":
            return "secondary";
        case "danger":
            return "danger";
        default:
            return "ghost";
    }
}
