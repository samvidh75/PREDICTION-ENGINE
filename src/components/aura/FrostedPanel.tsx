import React from "react";

interface FrostedPanelProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "main" | "form";
  role?: string;
  "aria-label"?: string;
}

export default function FrostedPanel({
  children,
  className = "",
  as: Tag = "div",
  role,
  "aria-label": ariaLabel,
}: FrostedPanelProps) {
  return (
    <Tag
      role={role}
      aria-label={ariaLabel}
      className={`rounded-2xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass ${className}`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
    >
      {children}
    </Tag>
  );
}

export function FrostedPanelLg({ children, className = "", as: Tag = "div" }: FrostedPanelProps) {
  return (
    <Tag
      className={`rounded-2xl bg-white/75 backdrop-blur-glassLg border border-white/50 shadow-glassLg ${className}`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)" }}
    >
      {children}
    </Tag>
  );
}

export function FrostedPanelStrong({ children, className = "", as: Tag = "div" }: FrostedPanelProps) {
  return (
    <Tag
      className={`rounded-2xl bg-white/85 backdrop-blur-glass border border-white/60 shadow-glassLg ${className}`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)" }}
    >
      {children}
    </Tag>
  );
}
