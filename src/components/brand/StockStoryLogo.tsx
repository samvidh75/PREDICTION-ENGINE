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
  className?: string;
}

const MARK_SIZES: Record<LogoSize, number> = { sm: 20, md: 28, lg: 36, hero: 48 };
const WORDMARK_SIZES: Record<LogoSize, "sm" | "md" | "lg"> = { sm: "sm", md: "md", lg: "lg", hero: "lg" };

export default function StockStoryLogo({ variant = "lockup", tone = "auto", size = "md", className = "" }: StockStoryLogoProps): JSX.Element {
  if (variant === "mark") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <BrandMark size={MARK_SIZES[size]} tone={tone} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <BrandWordmark tone={tone} size={WORDMARK_SIZES[size]} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark size={MARK_SIZES[size]} tone={tone} />
      <BrandWordmark tone={tone} size={WORDMARK_SIZES[size]} />
    </span>
  );
}
