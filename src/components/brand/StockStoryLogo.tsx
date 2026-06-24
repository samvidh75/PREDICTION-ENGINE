import React from "react";
import BrandMark from "./BrandMark";
import BrandWordmark from "./BrandWordmark";

export type LogoVariant = "mark" | "wordmark" | "lockup";
export type LogoTone = "light" | "dark" | "auto";
export type LogoSize = "sm" | "md" | "lg" | "hero";

interface StockStoryLogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  size?: LogoSize;
  showIndia?: boolean;
  animated?: boolean;
  className?: string;
}

export const MARK_SIZES: Record<LogoSize, number> = { sm: 24, md: 32, lg: 42, hero: 64 };
export const WORDMARK_SIZES: Record<LogoSize, "sm" | "md" | "lg"> = { sm: "sm", md: "md", lg: "lg", hero: "lg" };

export default function StockStoryLogo({
  variant = "lockup", tone = "auto", size = "md",
  showIndia = true, animated = false, className = "",
}: StockStoryLogoProps): JSX.Element {
  if (variant === "mark") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <BrandMark size={MARK_SIZES[size]} tone={tone} animated={animated} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <BrandWordmark tone={tone} size={WORDMARK_SIZES[size]} showIndia={showIndia} />
      </span>
    );
  }

  return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={MARK_SIZES[size]} tone={tone} animated={animated} />
      <BrandWordmark tone={tone} size={WORDMARK_SIZES[size]} showIndia={showIndia} />
    </span>
  );
}
