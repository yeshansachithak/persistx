// src/ui/panels/SchemaPanel.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import Card from "../common/Card";
import CodeBlock from "../common/CodeBlock";

/**
 * SchemaPanel
 *
 * Shows the currently active schema snapshot that PersistX is enforcing.
 * This is the "contract" view.
 */

export default function SchemaPanel() {
    const { state } = useTutorial();

    const schemaLabel =
        state.schemaRef?.versionLabel ??
        (state.schemaRef?.kind === "snapshot" ? state.schemaRef.file : "schema");

    const schemaJson = useMemo(() => {
        if (!state.schemaSnapshot) {
            return "// schema not loaded yet";
        }
        return JSON.stringify(state.schemaSnapshot, null, 2);
    }, [state.schemaSnapshot]);

    return (
        <Card
            title="Schema Contract"
            subtitle="This is what PersistX enforces. UI changes must be reflected here."
            right={
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                    {schemaLabel}
                </span>
            }
        >
            <div className="grid gap-3">
                <div className="text-xs text-zinc-500">
                    If your UI sends fields that don’t exist in this schema version, PersistX will reject the
                    submission (or treat them as unknown, depending on settings).
                </div>
                <CodeBlock code={schemaJson} language="json" />
            </div>
        </Card>
    );
}
