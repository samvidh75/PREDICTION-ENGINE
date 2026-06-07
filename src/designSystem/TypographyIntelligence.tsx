import React from "react";
import { sanitizeTypographyNode, type TypographySanitizationKind } from "./typography/typographyLanguageGovernance";

type CommonTextProps = {
  children: React.ReactNode;
  className?: string;
};

function sanitize(children: React.ReactNode, kind: TypographySanitizationKind): React.ReactNode {
  return sanitizeTypographyNode(children, kind);
}

export function HeroKicker({ children, className }: CommonTextProps): JSX.Element | null {
  const safe = sanitize(children, "heroKicker");

  if (typeof safe === "string" && safe.length === 0) return null;

  return (
    <div
      className={[
        "text-xs uppercase tracking-[0.28em] text-cyan-200/75",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {safe}
    </div>
  );
}

export function HeroTitle({ children, className }: CommonTextProps): JSX.Element {
  return (
    <h1
      className={[
        "text-4xl font-semibold tracking-tight text-white sm:text-5xl",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {children}
    </h1>
  );
}

export function SectionTitle({ children, className }: CommonTextProps): JSX.Element | null {
  const safe = sanitize(children, "sectionTitle");

  if (typeof safe === "string" && safe.length === 0) return null;

  return (
    <div
      className={[
        "text-sm uppercase tracking-[0.18em] text-cyan-200/80",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {safe}
    </div>
  );
}

export function MicroLabel({ children, className }: CommonTextProps): JSX.Element | null {
  const safe = sanitize(children, "microLabel");

  if (typeof safe === "string" && safe.length === 0) return null;

  return (
    <div className={["text-xs text-white/45", className ?? ""].join(" ").trim()}>
      {safe}
    </div>
  );
}

export function BodyText({ children, className }: CommonTextProps): JSX.Element {
  const safeChildren = sanitize(children, "bodyText");

  return (
    <div
      className={[
        "text-sm leading-6 text-white/60 sm:text-[15px]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {safeChildren}
    </div>
  );
}

export function CardLabel({ children, className }: CommonTextProps): JSX.Element | null {
  const safe = sanitize(children, "cardLabel");

  if (typeof safe === "string" && safe.length === 0) return null;

  return (
    <div
      className={[
        "text-xs uppercase tracking-[0.16em] text-cyan-200/65",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {safe}
    </div>
  );
}

export function CardHeading({ children, className }: CommonTextProps): JSX.Element | null {
  const safe = sanitize(children, "cardHeading");

  if (typeof safe === "string" && safe.length === 0) return null;

  return (
    <div
      className={[
        "text-lg font-semibold tracking-tight text-white",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {safe}
    </div>
  );
}

export function CardBody({ children, className }: CommonTextProps): JSX.Element {
  const safeChildren = sanitize(children, "cardBody");

  return (
    <div
      className={[
        "text-sm leading-6 text-white/58",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {safeChildren}
    </div>
  );
}
