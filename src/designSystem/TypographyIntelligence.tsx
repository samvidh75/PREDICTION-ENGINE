import React from "react";

type CommonTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function HeroKicker({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["text-[12px] uppercase tracking-[0.18em] text-white/65", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}

export function HeroTitle({ children, className }: CommonTextProps): JSX.Element {
  return (
    <h1 className={["mt-4 text-[52px] sm:text-[62px] font-semibold leading-[1.03] tracking-[-0.04em]", className ?? ""].join(" ").trim()}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["mt-3 text-[22px] font-medium text-white/92 leading-[1.2] tracking-[-0.02em]", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}

export function MicroLabel({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["text-[11px] uppercase tracking-[0.18em] text-white/45", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}

export function BodyText({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["text-[15px] leading-[1.95] text-white/85", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}

export function CardLabel({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["text-[12px] uppercase tracking-[0.18em] text-white/70", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}

export function CardHeading({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["mt-3 text-[18px] font-semibold text-white/92 leading-[1.3]", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CommonTextProps): JSX.Element {
  return (
    <div className={["mt-3 text-[14px] leading-[1.8] text-white/80", className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}
