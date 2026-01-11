// src/ui/panels/FormPanel.tsx

import { useMemo } from "react";
import { useTutorial } from "../../tutorial/TutorialContext";
import type { UiField } from "../../tutorial/types";
import Card from "../common/Card";

/**
 * FormPanel
 *
 * Renders a dynamic form based on UiField[] coming from the active tutorial step.
 * This is a PURE renderer:
 *  - No PersistX logic
 *  - No schema logic
 *  - No validation logic
 *
 * The TutorialRunner controls:
 *  - which fields exist
 *  - which fields are locked
 *  - current form values
 */

export default function FormPanel() {
    const { state, step, actions, updateFormValue: updateFormValueAlias } = useTutorial();

    const fields = step.uiFields ?? [];
    const values = state.formValues ?? {};
    const lockedKeys = step.enter?.lock?.fields ?? [];

    // Prefer the explicit alias (if runner provided it), else fall back to actions.updateFormValue
    const updateFormValue = updateFormValueAlias ?? actions.updateFormValue;

    const isEditable = Boolean(updateFormValue);

    const lockedSet = useMemo(() => new Set<string>(lockedKeys), [lockedKeys]);

    return (
        <Card title="Form" subtitle="This simulates your frontend form. UI can change faster than schema.">
            {!isEditable ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    <div className="font-semibold">Form editing is not wired yet</div>
                    <div className="mt-1 text-amber-800">
                        The tutorial runner didn’t provide <code className="rounded bg-amber-100 px-1">updateFormValue</code>. This
                        panel is read-only for now.
                    </div>
                </div>
            ) : null}

            {fields.length === 0 ? (
                <Empty />
            ) : (
                <div className="grid gap-4">
                    {fields.map((field) => (
                        <Field
                            key={field.key}
                            field={field}
                            value={values[field.key]}
                            locked={lockedSet.has(field.key) || !isEditable}
                            onChange={(v) => updateFormValue?.(field.key, v)}
                        />
                    ))}
                </div>
            )}
        </Card>
    );
}

function Field({
    field,
    value,
    locked,
    onChange
}: {
    field: UiField;
    value: unknown;
    locked?: boolean;
    onChange: (v: unknown) => void;
}) {
    const base = "w-full rounded-xl border px-3 py-2 text-sm outline-none transition";
    const enabled = "border-zinc-200 bg-white focus:ring-2 focus:ring-zinc-900/10";
    const disabled = "border-zinc-100 bg-zinc-100 text-zinc-500 cursor-not-allowed";

    return (
        <div className="grid gap-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                {field.label}
                {field.required ? (
                    <span className="rounded bg-rose-100 px-1 py-0.5 text-[10px] text-rose-700">required</span>
                ) : null}
                {locked ? (
                    <span className="rounded bg-zinc-200 px-1 py-0.5 text-[10px] text-zinc-600">locked</span>
                ) : null}
            </label>

            {renderInput(field, value, locked, onChange, base, enabled, disabled)}

            {field.note ? <div className="text-xs text-zinc-500">{field.note}</div> : null}
        </div>
    );
}

function renderInput(
    field: UiField,
    value: unknown,
    locked: boolean | undefined,
    onChange: (v: unknown) => void,
    base: string,
    enabled: string,
    disabled: string
) {
    const cls = `${base} ${locked ? disabled : enabled}`;

    switch (field.type) {
        case "number":
            return (
                <input
                    type="number"
                    className={cls}
                    placeholder={field.placeholder}
                    disabled={locked}
                    value={typeof value === "number" ? value : value == null ? "" : String(value)}
                    onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
            );

        case "textarea":
            return (
                <textarea
                    className={`${cls} min-h-[96px] resize-y`}
                    placeholder={field.placeholder}
                    disabled={locked}
                    value={typeof value === "string" ? value : value == null ? "" : String(value)}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case "boolean":
            return (
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300"
                        disabled={locked}
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span className="text-sm">{field.placeholder ?? "Enabled"}</span>
                </label>
            );

        case "text":
        default:
            return (
                <input
                    type="text"
                    className={cls}
                    placeholder={field.placeholder}
                    disabled={locked}
                    value={typeof value === "string" ? value : value == null ? "" : String(value)}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
    }
}

function Empty() {
    return (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No form fields defined for this step.
        </div>
    );
}
