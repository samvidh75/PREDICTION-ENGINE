import type { CSSProperties, ReactNode } from "react";
import { useResponsiveValue } from "./responsive";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const padding = useResponsiveValue("16px", "24px");

  return (
    <section
      style={{
        background: "var(--chip)",
        border: "1px solid var(--border)",
        boxShadow: "var(--sh-card)",
        borderRadius: "var(--radius-md)",
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
        color: "var(--text-500)",
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
