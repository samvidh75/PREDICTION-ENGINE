import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", className = "" }) => {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 border border-emerald-200/70 text-emerald-700",
    warning: "bg-amber-50 border border-amber-200/70 text-amber-700",
    danger: "bg-red-50 border border-red-200/70 text-red-600",
    info: "bg-sky-50 border border-sky-200/70 text-sky-700",
    neutral: "bg-slate-50 border border-slate-200/70 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
