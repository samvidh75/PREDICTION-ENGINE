import type { ButtonHTMLAttributes, ReactNode } from "react";
import { colors, typography, radius, animation } from "../design/tokens";

export type Variant = "primary" | "secondary" | "tertiary" | "install";

const STYLE_MAP: Record<Variant, { background: string; color: string; border: string }> = {
  primary:   { background: colors.primary, color: colors.onPrimary, border: "1px solid transparent" },
  secondary: { background: "transparent", color: colors.onDark, border: `1px solid ${colors.hairline}` },
  tertiary:  { background: colors.surfaceElevated, color: colors.onDark, border: "1px solid transparent" },
  install:   { background: colors.surfaceCard, color: colors.onDark, border: `1px solid ${colors.hairline}` },
};

// Principle 4: Interaction states — hover → 15% lift, active → 30%
const HOVER_BG: Record<Variant, string> = {
  primary:   colors.surface,       // subtle darken on white CTA
  secondary: colors.surfaceElevated,
  tertiary:  colors.surfaceCard,
  install:   colors.surfaceCard,
};

type Size = "sm" | "md" | "lg" | "icon";

const SIZE_MAP: Record<Size, { minHeight: string; fontSize: string; paddingX: string }> = {
  sm:   { minHeight: "32px", fontSize: typography.captionMd.size, paddingX: "12px" },
  md:   { minHeight: "42px", fontSize: typography.buttonMd.size, paddingX: "20px" },
  lg:   { minHeight: "50px", fontSize: typography.bodyMd.size, paddingX: "28px" },
  icon: { minHeight: "36px", fontSize: typography.captionMd.size, paddingX: "10px" },
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
  const hoverBg = HOVER_BG[variant];
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
        fontWeight: 500,
        lineHeight: "1.6",
        letterSpacing: "0.2px",
        padding: `0 ${sizeStyles.paddingX}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: "pointer",
        transition: `background-color ${animation.fast}, border-color ${animation.fast}`,
        userSelect: "none",
        WebkitFontSmoothing: "antialiased",
        ...base,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = base.background;
        props.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}
