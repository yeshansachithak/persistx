// src/ui/about/ReadmeMarkdown.tsx
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ReadmeMarkdown() {
    const [content, setContent] = useState<string>("");

    useEffect(() => {
        fetch("/README.md")
            .then((res) => res.text())
            .then(setContent)
            .catch(() => {
                setContent("Failed to load README.md");
            });
    }, []);

    if (!content) {
        return <div className="text-sm text-zinc-500">Loading documentation…</div>;
    }

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
        >
            {content}
        </ReactMarkdown>
    );
}
