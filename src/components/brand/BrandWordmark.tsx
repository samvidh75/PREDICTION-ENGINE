import React from "react";

interface BrandWordmarkProps {
  tone?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
  showIndia?: boolean;
}

const SIZES = {
  sm: { name: 13, country: 7, gap: 2 },
  md: { name: 17, country: 8, gap: 3 },
  lg: { name: 23, country: 10, gap: 4 },
} as const;

export default function BrandWordmark({ tone = "auto", size = "md", showIndia = true }: BrandWordmarkProps): JSX.Element {
  const dimensions = SIZES[size];
  const textColor = tone === "dark" ? "#F8FAFC" : tone === "light" ? "#0B1220" : "var(--color-text-primary, #0B1220)";

  return (
    <span className="inline-flex flex-col leading-none" aria-label="StockStory India">
      <span className="font-semibold tracking-[-0.045em]" style={{ fontSize: dimensions.name, color: textColor }}>
        StockStory
      </span>
      {showIndia && (
        <span
          className="font-semibold uppercase text-[#2962E7]"
          style={{ fontSize: dimensions.country, letterSpacing: "0.22em", marginTop: dimensions.gap }}
        >
          India
        </span>
      )}
    </span>
  );
}
