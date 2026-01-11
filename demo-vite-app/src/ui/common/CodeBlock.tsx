// src/ui/common/CodeBlock.tsx

export type CodeBlockProps = {
    code: string;
    language?: "ts" | "tsx" | "js" | "json" | "bash" | "text";
    className?: string;
};

export default function CodeBlock({ code, language = "text", className }: CodeBlockProps) {
    return (
        <pre
            className={[
                "overflow-auto rounded-2xl border border-zinc-200 bg-zinc-950 p-3 font-mono text-[12px] leading-5 text-zinc-100",
                className
            ]
                .filter(Boolean)
                .join(" ")}
            data-lang={language}
        >
            <code>{code}</code>
        </pre>
    );
}
