import type { ReactNode } from "react";
import { colors, typography, radius, layout, components, shadows } from "../design/tokens";
import { useResponsiveValue } from "./responsive";

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  const padding = useResponsiveValue(components.card.paddingMobile, components.card.paddingDesktop);

  return (
    <section
      style={{
        background: colors.card,
        border: `${layout.borderWidth} solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadows.card,
        padding,
        ...style,
      }}
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
