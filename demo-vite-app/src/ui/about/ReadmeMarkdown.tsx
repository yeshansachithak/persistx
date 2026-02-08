// src/ui/about/ReadmeMarkdown.tsx
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ReadmeMarkdown() {
    const [content, setContent] = useState<string>("");

    useEffect(() => {
        fetch("/README.md")
            .then((res) => {
                if (!res.ok) throw new Error("README fetch failed");
                return res.text();
            })
            .then(setContent)
            .catch(() => setContent("# PersistX\n\nFailed to load README.md"));
    }, []);

    if (!content) {
        return <div className="text-sm text-zinc-500">Loading documentation…</div>;
    }

    return (
        <div className="text-zinc-900">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="mb-4 text-3xl font-black tracking-tight">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="mt-8 mb-3 text-2xl font-bold tracking-tight">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="mt-6 mb-2 text-xl font-bold">{children}</h3>
                    ),
                    p: ({ children }) => (
                        <p className="mb-3 leading-7 text-zinc-700">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="mb-4 list-disc pl-6 text-zinc-700">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="mb-4 list-decimal pl-6 text-zinc-700">{children}</ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    a: ({ children, href }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500"
                        >
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="my-4 border-l-4 border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-700">
                            {children}
                        </blockquote>
                    ),
                    code: ({ className, children }) => {
                        const isBlock = Boolean(className);
                        if (isBlock) {
                            return (
                                <code className="block overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800">
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-sm text-zinc-800">
                                {children}
                            </code>
                        );
                    },
                    table: ({ children }) => (
                        <div className="my-4 overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">
                            {children}
                        </td>
                    ),
                    hr: () => <hr className="my-6 border-zinc-200" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
