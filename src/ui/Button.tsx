import type { ButtonHTMLAttributes, ReactNode } from "react";
import { colors, typography, radius, animation } from "../design/tokens";

export type Variant = "primary" | "secondary" | "tertiary" | "install";

const STYLE_MAP: Record<Variant, { background: string; color: string; border: string }> = {
  primary: {
    background: colors.accentBlue,
    color: "#FFFFFF",
    border: `1px solid ${colors.accentBlue}`,
  },
  secondary: {
    background: colors.surface,
    color: colors.textPrimary,
    border: `1px solid ${colors.hairline}`,
  },
  tertiary: {
    background: "transparent",
    color: colors.body,
    border: `1px solid transparent`,
  },
  install: {
    background: colors.surfaceElevated,
    color: colors.textPrimary,
    border: `1px solid ${colors.hairline}`,
  },
};

const HOVER_MAP: Record<Variant, { background: string; borderColor: string; color: string }> = {
  primary: {
    background: colors.primaryPressed,
    borderColor: colors.primaryPressed,
    color: "#FFFFFF",
  },
  secondary: {
    background: colors.surfaceElevated,
    borderColor: colors.hairlineStrong,
    color: colors.textPrimary,
  },
  tertiary: {
    background: colors.surface,
    borderColor: colors.hairline,
    color: colors.textPrimary,
  },
  install: {
    background: colors.surfaceCard,
    borderColor: colors.hairlineStrong,
    color: colors.textPrimary,
  },
};

type Size = "sm" | "md" | "lg" | "icon";

const SIZE_MAP: Record<Size, { minHeight: string; fontSize: string; paddingX: string }> = {
  sm:   { minHeight: "30px", fontSize: "12px", paddingX: "10px" },
  md:   { minHeight: "36px", fontSize: "13.5px", paddingX: "16px" },
  lg:   { minHeight: "44px", fontSize: "15px", paddingX: "24px" },
  icon: { minHeight: "34px", fontSize: "13px", paddingX: "10px" },
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
      style={{
        minHeight: sizeStyles.minHeight,
        borderRadius: radius.sm,
        fontFamily: typography.fontFamily,
        fontSize: sizeStyles.fontSize,
        fontWeight: 500,
        lineHeight: "1.4",
        letterSpacing: "0.1px",
        padding: `0 ${sizeStyles.paddingX}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        cursor: "pointer",
        transition: `background ${animation.fast}, border-color ${animation.fast}, color ${animation.fast}`,
        userSelect: "none",
        WebkitFontSmoothing: "antialiased",
        ...base,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hover.background;
        e.currentTarget.style.borderColor = hover.borderColor;
        e.currentTarget.style.color = hover.color;
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = base.background;
        e.currentTarget.style.borderColor = base.border.replace("1px solid ", "");
        e.currentTarget.style.color = base.color;
        props.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}
