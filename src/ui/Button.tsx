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

type Size = "sm" | "md" | "lg" | "icon";

const SIZE_MAP: Record<Size, { minHeight: string; fontSize: string; paddingX: string }> = {
  sm: { minHeight: "32px", fontSize: "13px", paddingX: "12px" },
  md: { minHeight: "40px", fontSize: typography.callout.desktop.size, paddingX: components.button.paddingX },
  lg: { minHeight: "48px", fontSize: typography.body.desktop.size, paddingX: "24px" },
  icon: { minHeight: "36px", fontSize: "13px", paddingX: "8px" },
};

export function Button({
  variant = "primary",
  size = "md",
  style,
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = STYLE_MAP[variant];
  const sizeStyles = SIZE_MAP[size];

  return (
    <button
      {...props}
      style={{
        minHeight: sizeStyles.minHeight,
        minWidth: size === "sm" ? "36px" : "44px",
        borderRadius: radius.md,
        fontFamily: typography.fontFamily,
        fontSize: sizeStyles.fontSize,
        fontWeight: 600,
        padding: `0 ${sizeStyles.paddingX}`,
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
