import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", className = "" }) => {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 border border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border border-amber-200 text-amber-800",
    danger: "bg-red-50 border border-red-200 text-red-700",
    info: "bg-sky-50 border border-sky-200 text-sky-800",
    neutral: "bg-slate-50 border border-slate-200 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
