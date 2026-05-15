import React from "react";

export function CompanyUniverseSectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}): JSX.Element {
  return (
    <div className="mb-6">
      {kicker && <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{kicker}</div>}
      <div className="mt-3 text-[24px] font-medium text-white/92 leading-[1.1]">{title}</div>
      {subtitle && <div className="mt-3 text-[14px] leading-[1.8] text-white/78 max-w-[820px]">{subtitle}</div>}
    </div>
  );
}

export function CompanyUniverseCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={[
        "rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.35)]",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CompanyUniverseGrid({
  children,
  columns = "grid-cols-1",
}: {
  children: React.ReactNode;
  columns?: "grid-cols-1" | "grid-cols-2" | "grid-cols-3";
}): JSX.Element {
  return <div className={["grid gap-6", columns].join(" ")}>{children}</div>;
}
