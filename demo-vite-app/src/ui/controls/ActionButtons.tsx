// src/ui/controls/ActionButtons.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import Button from "../common/Button";
import { dispatchStepAction } from "../../tutorial/TutorialRunner";

/**
 * ActionButtons
 * Renders the actions defined in the CURRENT step (data-driven).
 *
 * Actions come from tutorial config:
 *  - analyze
 *  - submit
 *  - setSchema
 *  - applyUiPatch
 *  - copyCli
 *  - clearDb
 *  - next/back (optional)
 *
 * This component does not contain story logic.
 * It only dispatches step actions to the TutorialRunner actions API.
 */

export default function ActionButtons() {
    const api = useTutorial();
    const { state, step } = api;

    const actions = step.actions ?? [];

    // Sort so primary actions come first, then secondary, then ghost.
    const ordered = useMemo(() => {
        const score = (tone: any) => {
            if (tone === "primary") return 0;
            if (tone === "secondary") return 1;
            if (tone === "danger") return 2;
            return 3; // ghost or undefined
        };
        return [...actions].sort((a, b) => score(a.tone) - score(b.tone));
    }, [actions]);

    if (!ordered.length) return null;

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {ordered.map((a) => {
                        const variant = toneToVariant(a.tone);
                        const disabled = state.isBusy || isNavDisabled(api, a.kind);

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
                </div>

                {/* Optional help line */}
                {step.explain?.length ? (
                    <div className="text-xs text-zinc-600">
                        <span className="font-semibold text-zinc-700">Why:</span>{" "}
                        {step.explain[0]}
                    </div>
                ) : null}
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

function isNavDisabled(api: any, kind: string) {
    if (kind === "next") return api.isLastStep;
    if (kind === "back") return api.isFirstStep;
    return false;
}
