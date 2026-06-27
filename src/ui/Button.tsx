import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useResponsiveValue } from "./responsive";
import { colors, typography, radius, layout, components, animation } from "../design/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: colors.primary, color: colors.white, border: `${layout.borderWidth} solid ${colors.primary}` },
  secondary: { background: colors.white, color: colors.gray900, border: `${layout.borderWidth} solid ${colors.gray100}` },
  ghost:     { background: "transparent", color: colors.gray600, border: "1px solid transparent" },
};

export function Button({ children, variant = "primary", style, ...props }: ButtonProps) {
  const height = useResponsiveValue(components.button.heightMobile, components.button.heightDesktop);

  return (
    <button
      {...props}
      style={{
        minHeight: height,
        minWidth: components.button.heightDesktop,
        borderRadius: radius.pill,
        fontFamily: typography.fontFamily,
        fontSize: typography.body.desktop.size,
        fontWeight: 500,
        padding: `${components.button.paddingY} ${components.button.paddingX}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: `filter ${animation.fast} ${animation.easing}, background-color ${animation.fast} ${animation.easing}`,
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
