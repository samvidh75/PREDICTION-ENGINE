import React from "react";

interface BrandMarkProps {
  size?: number;
  tone?: "light" | "dark" | "auto";
}

export default function BrandMark({ size = 28, tone = "auto" }: BrandMarkProps): JSX.Element {
  const isAuto = tone === "auto";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-label="StockStory India"
      role="img"
    >
      <rect
        x="1" y="1" width="26" height="26" rx="6"
        className={isAuto ? "stroke-[#2962FF] dark:stroke-[#5B8DEF]" : tone === "dark" ? "stroke-[#5B8DEF]" : "stroke-[#2962FF]"}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M7 20L7 14L11 14L11 10L14 10L14 6L17 6L17 10L20 10L20 14L21 14"
        className={isAuto ? "stroke-[#2962FF] dark:stroke-[#5B8DEF]" : tone === "dark" ? "stroke-[#5B8DEF]" : "stroke-[#2962FF]"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M17 20L17 16L14 16L14 14L11 14"
        className={isAuto ? "stroke-[#2962FF] dark:stroke-[#5B8DEF]" : tone === "dark" ? "stroke-[#5B8DEF]" : "stroke-[#2962FF]"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
      <circle
        cx="21" cy="14" r="1.5"
        className={isAuto ? "fill-emerald-500 dark:fill-emerald-400" : tone === "dark" ? "fill-emerald-400" : "fill-emerald-500"}
      />
    </svg>
  );
}
