import React from "react";

interface BrandWordmarkProps {
  tone?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
}

export default function BrandWordmark({ tone = "auto", size = "md" }: BrandWordmarkProps): JSX.Element {
  const fontSize = size === "sm" ? 13 : size === "lg" ? 20 : 16;
  const subSize = size === "sm" ? 9 : size === "lg" ? 12 : 10;
  const isAuto = tone === "auto";

  return (
    <span className="inline-flex items-baseline gap-1.5 leading-none" aria-label="StockStory India">
      <span
        className="font-semibold tracking-tight"
        style={{
          fontSize,
          color: isAuto ? "var(--color-text-primary)" : tone === "dark" ? "#E2E8F0" : "#0F172A",
        }}
      >
        StockStory
      </span>
      <span
        className="font-medium tracking-wider uppercase"
        style={{
          fontSize: subSize,
          color: isAuto ? "var(--color-text-secondary)" : tone === "dark" ? "#94A3B8" : "#64748B",
          letterSpacing: "0.08em",
        }}
      >
        India
      </span>
    </span>
  );
}
