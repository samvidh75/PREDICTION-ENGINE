import React from "react";

interface BrandMarkProps {
  size?: number;
  tone?: "light" | "dark" | "auto";
  animated?: boolean;
}

export default function BrandMark({ size = 28, tone = "auto", animated = false }: BrandMarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
    >
      <circle cx="32" cy="32" r="30" fill={tone === "dark" ? "#F4F6F8" : "var(--c-brand-subtle)"} />
      <g className={animated ? "origin-bottom animate-[brand-rise_.7s_ease-out_both]" : undefined}>
        <rect x="14" y="41" width="9" height="12" rx="2.5" fill="var(--c-brand)" opacity=".45" />
        <rect x="27.5" y="33" width="9" height="20" rx="2.5" fill="var(--c-brand)" opacity=".72" />
        <rect x="41" y="23" width="9" height="30" rx="2.5" fill="var(--c-brand)" />
      </g>
      <path
        d="M43.5 11.5C50.8 16.2 55.5 23.3 57.6 31.9"
        stroke="var(--c-positive)"
        strokeWidth="4.6"
        strokeLinecap="round"
        className={animated ? "animate-[brand-draw_.9s_.2s_ease-out_both]" : undefined}
        pathLength="1"
      />
    </svg>
  );
}
