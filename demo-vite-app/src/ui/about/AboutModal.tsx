// src/ui/about/AboutModal.tsx
import { X } from "lucide-react";
import ReadmeMarkdown from "./ReadmeMarkdown";

export default function AboutModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-zinc-900">About PersistX</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        aria-label="Close"
                        title="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scroll area */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                    <ReadmeMarkdown />
                </div>
            </div>
        </div>
    );
}
