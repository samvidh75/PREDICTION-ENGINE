import React from "react";

interface BrandWordmarkProps {
  tone?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
  showIndia?: boolean;
}

export default function BrandWordmark({ tone = "auto", size = "md", showIndia = true }: BrandWordmarkProps): JSX.Element {
  const fs = size === "sm" ? 13 : size === "lg" ? 20 : 16;
  const subFs = size === "sm" ? 9 : size === "lg" ? 12 : 10;
  const isAuto = tone === "auto";

  const txtColor = isAuto ? "var(--color-text-primary)" : tone === "dark" ? "#E2E8F0" : "#0F172A";
  const green = isAuto ? "var(--brand-green, #10A37F)" : "#10A37F";
  const muted = isAuto ? "var(--color-text-muted, #94A3B8)" : "#94A3B8";

  return (
    <span className="inline-flex items-baseline gap-0 leading-none" aria-label="StockStory India">
      <span className="font-semibold tracking-tight" style={{ fontSize: fs, color: txtColor }}>
        Stock<span style={{ color: green }}>Story</span>
      </span>
      {showIndia && (
        <span className="font-medium tracking-wider uppercase" style={{ fontSize: subFs, color: muted, marginLeft: 4, letterSpacing: "0.06em" }}>
          India
        </span>
      )}
    </span>
  );
}
