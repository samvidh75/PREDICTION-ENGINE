import type { CSSProperties, ReactNode } from "react";
import { colors, radius, typography, space } from "../design/tokens";

/* ── Panel container ─────────────────────────────────────────────── */

function Panel({
  children,
  variant = "default",
  style,
  className,
}: {
  children: ReactNode;
  variant?: "default" | "elevated";
  style?: CSSProperties;
  className?: string;
}) {
  const bg = variant === "elevated" ? colors.surface : colors.canvas;
  return (
    <div
      className={className}
      style={{
        background: bg,
        borderRadius: radius.md,
        border: `1px solid ${colors.hairline}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Panel.Header — title bar with optional icon + action ────────── */

function Header({
  icon,
  title,
  action,
  style,
}: {
  icon?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: `${space[4]} ${space[6]}`,
        borderBottom: `1px solid ${colors.hairline}`,
        ...style,
      }}
    >
      {icon ? (
        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {icon}
        </span>
      ) : null}
      <span
        style={{
          flex: 1,
          fontSize: typography.captionMd.size,
          fontWeight: 600,
          color: colors.mute,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {title}
      </span>
      {action ? (
        <span style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {action}
        </span>
      ) : null}
    </div>
  );
}

/* ── Panel.Filters — horizontal filter bar ───────────────────────── */

function Filters({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        padding: space[6],
        borderBottom: `1px solid ${colors.hairline}`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Panel.Content — padded body area ────────────────────────────── */

function Content({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ padding: space[6], ...style }}>{children}</div>;
}

/* ── Panel.Footer — subtle bottom bar ────────────────────────────── */

function Footer({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: space[6],
        borderTop: `1px solid ${colors.hairline}`,
        fontFamily: typography.fontFamily,
        fontSize: typography.captionMd.size,
        color: colors.mute,
      }}
    >
      {children}
    </div>
  );
}

Panel.Header = Header;
Panel.Filters = Filters;
Panel.Content = Content;
Panel.Footer = Footer;

export { Panel };
