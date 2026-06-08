import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Intelligence Card Anatomy Primitives
 * - Provides governance for “card regions” across widgets
 * - Cards can keep their internal layout, but must adopt region discipline
 * - Future: Interaction-State + spacing tokens can attach to these regions
 */
export function CardHeader({ children, className }: Props): JSX.Element {
  return (
    <div
      className={["flex items-start justify-between gap-4", className ?? ""].join(" ").trim()}
      data-ss-card-region="header"
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className }: Props): JSX.Element {
  return (
    <div className={[className ?? ""].join(" ").trim()} data-ss-card-region="body">
      {children}
    </div>
  );
}

export function CardTelemetryRow({ children, className }: Props): JSX.Element {
  return (
    <div className={["mt-3 flex items-center gap-3", className ?? ""].join(" ").trim()} data-ss-card-region="telemetry">
      {children}
    </div>
  );
}

export function CardActions({ children, className }: Props): JSX.Element {
  return (
    <div className={["mt-3 flex flex-wrap gap-2", className ?? ""].join(" ").trim()} data-ss-card-region="actions">
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: Props): JSX.Element {
  return (
    <div className={[className ?? ""].join(" ").trim()} data-ss-card-region="footer">
      {children}
    </div>
  );
}

export default function IntelligenceCardAnatomy(): null {
  return null;
}
