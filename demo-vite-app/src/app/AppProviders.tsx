// src/app/AppProviders.tsx

import React, { useEffect, useMemo, useState } from "react";
import TutorialRunner from "../tutorial/TutorialRunner";
import { petTutorial } from "../tutorials/pet/pet.tutorial";
import { createSchemaLoader } from "../persistx/schemaLoader";
import { createPersistxRuntime, type PersistxRuntime } from "../persistx/persistxClient";

type SchemaSnapshot = {
    persistx: number;
    definitions: any[];
};

type AppProvidersProps = {
    children: React.ReactNode;
};

/**
 * AppProviders wires:
 * - chosen tutorial (petTutorial)
 * - schema loader (from /public/schemas/...)
 * - PersistX runtime (engine + registry + adapter)
 * - TutorialRunner (context + navigation + step execution)
 *
 * UI is passed as children and consumes TutorialContext.
 */
export default function AppProviders({ children }: AppProvidersProps) {
    const tutorial = petTutorial;

    const loadSchema = useMemo(() => createSchemaLoader(tutorial.schemaBaseUrl), [tutorial.schemaBaseUrl]);

    const [bootError, setBootError] = useState<string>("");
    const [runtime, setRuntime] = useState<PersistxRuntime | null>(null);

    // Bootstrap runtime with schema v1 by default.
    // Tutorial steps can later swap schema snapshots via actions (setSchema).
    useEffect(() => {
        let cancelled = false;

        (async () => {
            setBootError("");
            try {
                const schema = (await loadSchema({
                    kind: "snapshot",
                    file: "schema.v1.json",
                    versionLabel: "v1"
                })) as SchemaSnapshot;

                const rt = createPersistxRuntime(schema);

                if (!cancelled) setRuntime(rt);
            } catch (e: any) {
                if (!cancelled) setBootError(e?.message ?? String(e));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [loadSchema]);

    if (bootError) {
        return (
            <div className="min-h-dvh bg-zinc-50 p-6">
                <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
                    <div className="font-semibold">Failed to start demo</div>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">{bootError}</pre>
                    <div className="mt-3 text-xs text-rose-800">
                        Check that your schema snapshots exist under{" "}
                        <code className="rounded bg-white/60 px-1 py-0.5">public{tutorial.schemaBaseUrl}</code>
                        .
                    </div>
                </div>
            </div>
        );
    }

    if (!runtime) {
        return (
            <div className="min-h-dvh bg-zinc-50 p-6">
                <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
                    Loading PersistX tutorial…
                </div>
            </div>
        );
    }

    return (
        <TutorialRunner tutorial={tutorial} runtime={runtime} loadSchema={loadSchema}>
            {children}
        </TutorialRunner>
    );
}
