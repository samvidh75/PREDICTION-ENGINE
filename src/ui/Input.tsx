import type { InputHTMLAttributes } from "react";
import { colors, radius, typography, components } from "../design/tokens";

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
        border: `1px solid ${colors.gray100}`,
        fontSize: typography.body.desktop.size,
        fontFamily: typography.fontFamily,
        color: colors.gray900,
        background: colors.white,
        outline: "none",
        transition: `border-color 150ms ease-in-out, box-shadow 150ms ease-in-out`,
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = colors.primary;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.primary}`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = colors.gray100;
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}
