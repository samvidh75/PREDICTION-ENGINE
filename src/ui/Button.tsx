import type { ButtonHTMLAttributes, ReactNode } from "react";
import { colors, typography, radius, layout, components, animation } from "../design/tokens";
import { useResponsiveValue } from "./responsive";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const STYLE_MAP: Record<Variant, { background: string; color: string; border: string }> = {
  primary:     { background: colors.primary, color: "#FFFFFF", border: `1px solid ${colors.primary}` },
  secondary:   { background: colors.card, color: colors.textPrimary, border: `1px solid ${colors.border}` },
  ghost:       { background: "transparent", color: colors.primary, border: "1px solid transparent" },
  destructive: { background: colors.danger, color: "#FFFFFF", border: `1px solid ${colors.danger}` },
};

export function Button({
  variant = "primary",
  style,
  children,
  ...props
}: {
  variant?: Variant;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = STYLE_MAP[variant];
  const height = useResponsiveValue(components.button.heightMobile, components.button.heightDesktop);

  return (
    <button
      {...props}
      style={{
        minHeight: height,
        minWidth: "44px",
        borderRadius: radius.md,
        fontFamily: typography.fontFamily,
        fontSize: typography.callout.desktop.size,
        fontWeight: 600,
        padding: `0 ${components.button.paddingX}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: `filter ${animation.standard}, background-color ${animation.standard}, box-shadow ${animation.standard}`,
        ...base,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === "primary" || variant === "destructive") {
          e.currentTarget.style.filter = "brightness(0.92)";
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "";
        props.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}
