import type { InputHTMLAttributes } from "react";
import { colors, radius, typography, animation } from "../design/tokens";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <input
      {...props}
      style={{
        height: "42px",
        padding: "0 16px",
        borderRadius: radius.md,
        border: `1px solid ${colors.hairline}`,
        fontSize: typography.bodyMd.size,
        fontFamily: typography.fontFamily,
        fontFeatureSettings: typography.fontFeature,
        color: colors.onDark,
        background: colors.surfaceElevated,
        outline: "none",
        caretColor: colors.onDark,
        transition: `border-color ${animation.standard}`,
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = colors.onDark;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = colors.hairline;
        props.onBlur?.(e);
      }}
    />
  );
}
