// src/ui/panels/ResultPanel.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import Card from "../common/Card";
import CodeBlock from "../common/CodeBlock";

/**
 * ResultPanel
 *
 * Shows:
 * - last error (if any)
 * - last analyze output (validate/normalize/map/unknown)
 * - last submit output (adapter request + db snapshot)
 */

export default function ResultPanel() {
    const { state } = useTutorial();

    const status = state.lastError
        ? "error"
        : state.lastSubmitResult
            ? "success"
            : state.lastAnalysis
                ? "info"
                : "idle";

    const headerRight = (
        <span
            className={[
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                status === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : status === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : status === "info"
                            ? "border-zinc-200 bg-zinc-50 text-zinc-700"
                            : "border-zinc-200 bg-white text-zinc-500"
            ].join(" ")}
        >
            {status.toUpperCase()}
        </span>
    );

    const errorText = state.lastError
        ? typeof state.lastError === "string"
            ? state.lastError
            : JSON.stringify(state.lastError, null, 2)
        : "";

    const analyzeText = useMemo(() => {
        if (!state.lastAnalysis) return "";
        return JSON.stringify(state.lastAnalysis, null, 2);
    }, [state.lastAnalysis]);

    const submitText = useMemo(() => {
        if (!state.lastSubmitResult) return "";
        return JSON.stringify(state.lastSubmitResult, null, 2);
    }, [state.lastSubmitResult]);

    return (
        <Card title="What happened?" subtitle="PersistX output + adapter boundary." right={headerRight}>
            <div className="grid gap-4">
                {state.lastError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <div className="text-xs font-semibold text-rose-900">Error</div>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-900">{errorText}</pre>
                    </div>
                ) : null}

                <div>
                    <div className="mb-1 text-xs font-semibold text-zinc-700">
                        Analyze Output (validate → normalize → map)
                    </div>
                    {analyzeText ? (
                        <CodeBlock code={analyzeText} language="json" />
                    ) : (
                        <Empty text="Run Analyze to see validation + mapping + unknown detection." />
                    )}
                </div>

                <div>
                    <div className="mb-1 text-xs font-semibold text-zinc-700">
                        Submit Output (adapter.save boundary)
                    </div>
                    {submitText ? (
                        <CodeBlock code={submitText} language="json" />
                    ) : (
                        <Empty text="Run Save to see what data reaches storage + DB snapshot." />
                    )}
                </div>
            </div>
        </Card>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-600">
            {text}
        </div>
    );
}
