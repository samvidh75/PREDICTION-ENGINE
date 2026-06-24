import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
  glass?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", glass = false, className = "" }) => {
  const styles: Record<string, string> = {
    success: glass
      ? "bg-emerald-50/60 backdrop-blur-sm border border-emerald-200/50 text-emerald-700"
      : "bg-emerald-50 border border-emerald-200/70 text-emerald-700",
    warning: glass
      ? "bg-slate-50/60 backdrop-blur-sm border border-slate-200/50 text-slate-700"
      : "bg-slate-50 border border-slate-200/70 text-slate-700",
    danger: glass
      ? "bg-red-50/60 backdrop-blur-sm border border-red-200/50 text-red-600"
      : "bg-red-50 border border-red-200/70 text-red-600",
    info: glass
      ? "bg-sky-50/60 backdrop-blur-sm border border-sky-200/50 text-sky-700"
      : "bg-sky-50 border border-sky-200/70 text-sky-700",
    neutral: glass
      ? "bg-slate-50/60 backdrop-blur-sm border border-slate-200/50 text-slate-500"
      : "bg-slate-50 border border-slate-200/70 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium leading-4 border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
