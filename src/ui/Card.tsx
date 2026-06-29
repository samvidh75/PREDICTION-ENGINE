import type { ReactNode } from "react";
import { colors, typography, radius, animation } from "../design/tokens";

type CardVariant = "default" | "elevated" | "command" | "store";

const CARD_STYLES: Record<CardVariant, { background: string; border: string }> = {
  default:  { background: colors.canvas, border: `1px solid ${colors.hairline}` },
  elevated: { background: colors.surface, border: `1px solid ${colors.hairline}` },
  command:  { background: "transparent", border: `1px solid ${colors.hairline}` },
  store:    { background: colors.surfaceCard, border: `1px solid ${colors.hairline}` },
};

export function Card({
  children,
  style,
  onClick,
  className,
  variant = "default",
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
  className?: string;
  variant?: CardVariant;
}) {
  const v = CARD_STYLES[variant];

  return (
    <section
      style={{
        background: v.background,
        border: v.border,
        borderRadius: radius.md,
        padding: "24px",
        cursor: onClick ? "pointer" : undefined,
        transition: `background-color ${animation.standard}`,
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
        color: colors.mute,
        fontSize: typography.captionSm.size,
        fontWeight: 500,
        lineHeight: typography.captionSm.line,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        marginBottom: "8px",
        display: "block",
      }}
    >
      {children}
    </span>
  );
}
