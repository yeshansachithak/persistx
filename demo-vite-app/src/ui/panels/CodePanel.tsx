// src/ui/panels/CodePanel.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import Card from "../common/Card";
import CodeBlock from "../common/CodeBlock";

/**
 * CodePanel
 *
 * Shows what a developer would write in a real app:
 * - persistx.submit(...)
 * - CLI command for schema diff (when relevant)
 *
 * This panel is derived from TutorialContext state + current step actions.
 */

export default function CodePanel() {
    const { state, step } = useTutorial();

    const formKey = state.activeFormKey;
    const schemaLabel = state.schemaRef?.versionLabel ?? state.schemaRef?.kind ?? "schema";
    const uid = state.context?.uid ?? "user-001";

    const payloadPreview = useMemo(() => {
        const p =
            state.payloadMode === "raw"
                ? safeJsonParse(state.rawPayloadText ?? "{}") ?? {}
                : state.formValues ?? {};
        return JSON.stringify(p, null, 2);
    }, [state.payloadMode, state.rawPayloadText, state.formValues]);

    const submitSnippet = useMemo(() => {
        return `import { createPersistx, createInMemoryRegistry } from "@persistx/core";

// ... registry + adapter created elsewhere
await persistx.submit("${formKey}", payload, {
  uid: "${uid}",
  // schemaVersion is optional; omit to use latest
  // schemaVersion: ${schemaLabel.startsWith("v") ? schemaLabel.slice(1) : "undefined"}
});`;
    }, [formKey, uid, schemaLabel]);

    const cliCmd = useMemo(() => {
        const a = (step.actions ?? []).find((x) => x.kind === "copyCli");
        return (a && "command" in a ? (a.command as string) : "") || "";
    }, [step.actions]);

    return (
        <Card title="Developer View" subtitle="The only line your UI needs to call PersistX.">
            <div className="grid gap-4">
                <div>
                    <div className="mb-1 text-xs font-semibold text-zinc-700">
                        1) Your app code
                    </div>
                    <CodeBlock code={submitSnippet} language="ts" />
                </div>

                <div>
                    <div className="mb-1 text-xs font-semibold text-zinc-700">
                        2) Payload (what your UI sends)
                    </div>
                    <CodeBlock code={payloadPreview} language="json" />
                    <div className="mt-2 text-xs text-zinc-500">
                        Tip: In the tutorial, this payload comes from the <b>Form panel</b> or raw JSON mode.
                    </div>
                </div>

                <div>
                    <div className="mb-1 text-xs font-semibold text-zinc-700">
                        3) CLI (only needed for renames)
                    </div>
                    {cliCmd ? (
                        <>
                            <CodeBlock code={cliCmd} language="bash" />
                            <div className="mt-2 text-xs text-zinc-500">
                                You run this when you rename fields, to safely generate <b>aliases</b>.
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                            No CLI action in this step.
                            <div className="mt-1 text-[11px] text-zinc-500">
                                (CLI appears in the rename story where we simulate <code>persistx diff --apply</code>.)
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

function safeJsonParse(txt: string) {
    try {
        return JSON.parse(txt);
    } catch {
        return null;
    }
}
