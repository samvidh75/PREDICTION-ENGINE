import React from "react";

interface ResearchCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  role?: string;
  "aria-label"?: string;
}

export default function ResearchCard({
  children,
  className = "",
  onClick,
  hover = true,
  role,
  "aria-label": ariaLabel,
}: ResearchCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      role={role || (onClick ? "button" : undefined)}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`rounded-2xl bg-[#0D1117]/70 backdrop-blur-sm border border-white/40 shadow-sm ${
        hover ? "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" : ""
      } ${onClick ? "cursor-pointer text-left" : ""} ${className}`}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
    >
      {children}
    </Tag>
  );
}

export function ResearchCardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3.5 border-b border-white/30 ${className}`}>
      {children}
    </div>
  );
}
