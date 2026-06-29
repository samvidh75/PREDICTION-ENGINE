import type { ReactNode } from "react";
import { colors, radius, typography, space } from "../design/tokens";

function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radius.md,
        border: `1px solid ${colors.hairline}`,
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
        padding: space[6],
        borderBottom: `1px solid ${colors.hairline}`,
      }}
    >
      {children}
    </div>
  );
}

function Content({ children }: { children: ReactNode }) {
  return <div style={{ padding: space[6] }}>{children}</div>;
}

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

Panel.Filters = Filters;
Panel.Content = Content;
Panel.Footer = Footer;

export { Panel };
