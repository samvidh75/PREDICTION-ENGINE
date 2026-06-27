import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useResponsiveValue } from "./responsive";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: { background: "var(--brand)", color: "var(--text-inverse)", border: "1px solid var(--brand)" },
  secondary: { background: "var(--page)", color: "var(--text-primary)", border: "1px solid var(--border)" },
  ghost: { background: "transparent", color: "var(--text-500)", border: "1px solid transparent" },
};

export function Button({ children, variant = "primary", style, ...props }: ButtonProps) {
  const height = useResponsiveValue("44px", "40px");

  return (
    <button
      {...props}
      style={{
        minHeight: height,
        minWidth: "44px",
        borderRadius: "var(--radius-xl)",
        fontFamily: "var(--font)",
        fontSize: "14px",
        fontWeight: 500,
        padding: "0 20px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: "filter 120ms ease, background-color 120ms ease",
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={(event) => {
        if (variant === "primary") {
          event.currentTarget.style.filter = "brightness(0.92)";
        }
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.filter = "none";
        props.onMouseLeave?.(event);
      }}
    >
      {children}
    </button>
  );
}
