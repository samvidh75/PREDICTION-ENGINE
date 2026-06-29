import type { ReactNode } from "react";
import { colors, typography, radius, layout, components, shadows } from "../design/tokens";
import { useResponsiveValue } from "./responsive";

export function Card({ children, style, onClick, className, variant }: { children: ReactNode; style?: React.CSSProperties; onClick?: React.MouseEventHandler; className?: string; variant?: "default" | "accent" }) {
  const padding = useResponsiveValue(components.card.paddingMobile, components.card.paddingDesktop);

  return (
    <section
      style={{
        background: variant === "accent" ? "linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%)" : colors.card,
        border: `${layout.borderWidth} solid ${variant === "accent" ? "#FFD4A8" : colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadows.card,
        padding,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      onClick={onClick}
      className={className}
    >
      {children}
    </section>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        color: colors.textSecondary,
        fontSize: typography.caption.desktop.size,
        fontWeight: 500,
        lineHeight: typography.caption.desktop.line,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        marginBottom: "8px",
        display: "block",
      }}
    >
      {children}
    </span>
  );
}
