import type { ButtonHTMLAttributes, ReactNode } from "react";
import { colors, typography, radius, animation } from "../design/tokens";

export type Variant = "primary" | "secondary" | "tertiary" | "install";

const STYLE_MAP: Record<Variant, { background: string; color: string; border: string; boxShadow?: string }> = {
  primary: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    color: colors.textPrimary,
    border: `1px solid ${colors.hairlineSoft}`,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
  },
  secondary: {
    background: "rgba(255,255,255,0.02)",
    color: colors.onDark,
    border: `1px solid ${colors.hairline}`,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
  },
  tertiary: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%)",
    color: colors.onDark,
    border: `1px solid ${colors.hairlineSoft}`,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
  },
  install: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    color: colors.onDark,
    border: `1px solid ${colors.hairlineSoft}`,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
  },
};

const HOVER_MAP: Record<Variant, { background: string; borderColor: string; color: string; boxShadow?: string; transform?: string }> = {
  primary: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)",
    borderColor: colors.hairlineStrong,
    color: colors.textPrimary,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 14px 30px rgba(0,0,0,0.24)",
    transform: "translateY(-1px)",
  },
  secondary: {
    background: colors.surfaceElevated,
    borderColor: colors.hairlineStrong,
    color: colors.textPrimary,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
  },
  tertiary: {
    background: colors.surfaceCard,
    borderColor: colors.hairlineStrong,
    color: colors.textPrimary,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
  },
  install: {
    background: colors.surfaceCard,
    borderColor: colors.hairlineStrong,
    color: colors.textPrimary,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
  },
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
  const hover = HOVER_MAP[variant];
  const sizeStyles = SIZE_MAP[size];

  return (
    <button
      {...props}
      className="stockex-glass-btn"
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
        transition: `background ${animation.fast}, border-color ${animation.fast}, color ${animation.fast}, box-shadow ${animation.fast}, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
        userSelect: "none",
        WebkitFontSmoothing: "antialiased",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        willChange: "transform",
        ...base,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hover.background;
        e.currentTarget.style.borderColor = hover.borderColor;
        e.currentTarget.style.color = hover.color;
        e.currentTarget.style.boxShadow = hover.boxShadow ?? "";
        e.currentTarget.style.transform = hover.transform ?? "translateY(0) scale(1)";
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = base.background;
        e.currentTarget.style.borderColor = base.border.replace("1px solid ", "");
        e.currentTarget.style.color = base.color;
        e.currentTarget.style.boxShadow = base.boxShadow ?? "";
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        props.onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        // A quick physical "press" — the useanimations.com button feel:
        // an immediate compress followed by a springy overshoot on release.
        e.currentTarget.style.transform = "scale(0.955)";
        props.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = hover.transform ?? "translateY(0) scale(1)";
        props.onMouseUp?.(e);
      }}
    >
      {children}
    </button>
  );
}
