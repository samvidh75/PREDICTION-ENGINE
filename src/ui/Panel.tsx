import type { ReactNode } from "react";
import { colors, radius, layout, typography } from "../design/tokens";

function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Filters({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        padding: layout.padding,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {children}
    </div>
  );
}

function Content({ children }: { children: ReactNode }) {
  return <div style={{ padding: layout.padding }}>{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: layout.padding,
        borderTop: `1px solid ${colors.border}`,
        fontFamily: typography.fontFamily,
        fontSize: typography.caption.desktop.size,
        color: colors.textSecondary,
      }}
    >
      {children}
    </div>
  );
}

Panel.Filters = Filters;
Panel.Content = Content;
Panel.Footer = Footer;

export { Panel };
