// src/ui/common/Button.tsx

import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export type ButtonProps = {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: ButtonVariant;
    title?: string;
    type?: "button" | "submit" | "reset";
    className?: string;
};

export default function Button({
    children,
    onClick,
    disabled,
    variant = "primary",
    title,
    type = "button",
    className
}: ButtonProps) {
    const base =
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition " +
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

    const styles: Record<ButtonVariant, string> = {
        primary: "bg-zinc-900 text-white hover:bg-zinc-800",
        secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        danger: "bg-rose-600 text-white hover:bg-rose-500",
        ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100"
    };

    return (
        <button
            type={type}
            className={[base, styles[variant], className].filter(Boolean).join(" ")}
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
}
