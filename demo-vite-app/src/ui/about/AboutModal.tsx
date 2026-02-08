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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative z-10 max-h-[90vh] w-[95vw] max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                    <h2 className="text-lg font-bold">About PersistX</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-6">
                    <ReadmeMarkdown />
                </div>
            </div>
        </div>
    );
}
