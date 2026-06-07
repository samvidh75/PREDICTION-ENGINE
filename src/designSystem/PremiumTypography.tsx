import React from "react";
import { sanitizeTypographyNode, type TypographySanitizationKind } from "./typography/typographyLanguageGovernance";

type CommonProps = {
  children: React.ReactNode;
  className?: string;
};

function sanitize(children: React.ReactNode, kind: TypographySanitizationKind): React.ReactNode {
  return sanitizeTypographyNode(children, kind);
}

export function ModuleKicker({ children, className }: CommonProps): JSX.Element | null {
  const safe = sanitize(children, "moduleKicker");
  if (typeof safe === "string" && safe.length === 0) return null;
  return <div className={["ss-ty-module-kicker", className ?? ""].join(" ").trim()}>{safe}</div>;
}

export function ModuleTitle({ children, className }: CommonProps): JSX.Element {
  const safe = sanitize(children, "moduleTitle");
  return <div className={["ss-ty-module-title", className ?? ""].join(" ").trim()}>{safe}</div>;
}

export function NavLabel({ children, className }: CommonProps): JSX.Element | null {
  const safe = sanitize(children, "navLabel");
  if (typeof safe === "string" && safe.length === 0) return null;
  return <div className={["ss-ty-nav-label", className ?? ""].join(" ").trim()}>{safe}</div>;
}

export function WidgetSupport({ children, className }: CommonProps): JSX.Element {
  const safe = sanitize(children, "widgetSupport");
  return <div className={["ss-ty-widget-support", className ?? ""].join(" ").trim()}>{safe}</div>;
}

export function MetricValue({ children, className }: CommonProps): JSX.Element {
  const safe = sanitize(children, "metricValue");
  return <div className={["ss-ty-metric-value", className ?? ""].join(" ").trim()}>{safe}</div>;
}

export function MetricSubValue({ children, className }: CommonProps): JSX.Element {
  const safe = sanitize(children, "metricSubValue");
  return <div className={["ss-ty-metric-subvalue", className ?? ""].join(" ").trim()}>{safe}</div>;
}

export function MetricLabel({ children, className }: CommonProps): JSX.Element | null {
  const safe = sanitize(children, "metricLabel");
  if (typeof safe === "string" && safe.length === 0) return null;
  return <div className={["ss-ty-metric-label", className ?? ""].join(" ").trim()}>{safe}</div>;
}
