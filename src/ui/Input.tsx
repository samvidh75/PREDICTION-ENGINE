import type { InputHTMLAttributes } from "react";
import { colors, radius, typography, components, animation } from "../design/tokens";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <input
      {...props}
      style={{
        height: components.input.height,
        padding: `0 ${components.input.paddingX}`,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        fontSize: typography.body.desktop.size,
        fontFamily: typography.fontFamily,
        color: colors.textPrimary,
        background: colors.card,
        outline: "none",
        transition: `border-color ${animation.standard}, box-shadow ${animation.standard}`,
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = colors.primary;
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0, 122, 255, 0.15)`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}
