import React from "react";
import type { LucideIcon } from "lucide-react";

type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<IconSize, { width: number; height: number }> = {
  xs: { width: 12, height: 12 },
  sm: { width: 14, height: 14 },
  md: { width: 16, height: 16 },
  lg: { width: 20, height: 20 },
  xl: { width: 24, height: 24 },
};

interface AppIconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  ariaHidden?: boolean;
}

export function AppIcon({ icon: Icon, size = "md", className = "", ariaHidden = true }: AppIconProps) {
  const dims = SIZE_MAP[size];
  return <Icon width={dims.width} height={dims.height} className={className} aria-hidden={ariaHidden} />;
}

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  size?: IconSize;
  label: string;
  variant?: "ghost" | "surface" | "primary";
  className?: string;
}

export function IconButton({
  icon,
  onClick,
  size = "md",
  label,
  variant = "ghost",
  className = "",
}: IconButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-lg transition-all duration-200";
  const variantClasses = variant === "primary"
    ? "bg-[#2A6AFF] text-white hover:bg-[#1F52D0] shadow-[0_0_20px_rgba(42,106,255,0.1)]"
    : variant === "surface"
      ? "border border-[rgba(148,163,184,0.14)] bg-[#0C1119] text-[#9AA7B5] hover:border-[rgba(42,106,255,0.3)] hover:bg-[rgba(42,106,255,0.08)] hover:text-[#E8EDF2]"
      : "text-[#9AA7B5] hover:text-[#E8EDF2] hover:bg-[rgba(255,255,255,0.04)]";

  const sizeClasses = size === "xs" ? "h-7 w-7" : size === "sm" ? "h-8 w-8" : size === "md" ? "h-9 w-9" : size === "lg" ? "h-10 w-10" : "h-12 w-12";
  const iconSize: IconSize = size === "xl" ? "lg" : size === "lg" ? "md" : size === "md" ? "sm" : size === "sm" ? "xs" : "xs";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      aria-label={label}
    >
      <AppIcon icon={icon} size={iconSize} />
    </button>
  );
}

export type { IconSize };
