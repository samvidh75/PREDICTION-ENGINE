import type { CSSProperties, ReactNode } from "react";
import { useResponsiveValue } from "./responsive";
import { colors, radius, layout } from "../design/tokens";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const padding = useResponsiveValue(layout.cardPaddingMobile, layout.cardPaddingDesktop);

  return (
    <section
      style={{
        background: colors.gray50,
        border: `${layout.borderWidth} solid ${colors.gray100}`,
        borderRadius: radius.lg,
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
    <div
      style={{
        color: colors.gray600,
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "1.4",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: "12px",
      }}
    >
      {children}
    </div>
  );
}
