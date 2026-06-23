import React from "react";

interface BrandMarkProps {
  size?: number;
  tone?: "light" | "dark" | "auto";
  animated?: boolean;
}

function colors(tone: "light" | "dark" | "auto", isDark: boolean) {
  const d = tone === "dark" || (tone === "auto" && isDark);
  return {
    surface: d ? "#0D1117" : "#FFFFFF",
    stroke: d ? "#7CE0C3" : "#10A37F",
    accent: d ? "#10A37F" : "#087A61",
    signal: d ? "#DDF7EF" : "#10A37F",
    muted: d ? "#30363D" : "#E2E8F0",
  };
}

export default function BrandMark({ size = 28, tone = "auto", animated = false }: BrandMarkProps): JSX.Element {
  const isDark = tone === "dark" || (tone === "auto" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const c = colors(tone, isDark);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.surface} />
          <stop offset="100%" stopColor={c.surface} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="27" height="27" rx="7" fill="url(#bg-grad)" stroke={c.muted} strokeWidth="1" />
      <path
        d="M8 17 C8 13 12 11 14 15 C16 19 20 17 20 13"
        stroke={c.stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        className={animated ? "animate-pulse" : ""}
      />
      <path
        d="M8 11 C8 15 12 17 14 13 C16 9 20 11 20 15"
        stroke={c.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <circle cx="20" cy="13" r="1.8" fill={c.signal} />
    </svg>
  );
}
