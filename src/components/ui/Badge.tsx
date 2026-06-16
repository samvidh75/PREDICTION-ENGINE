import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  className = "",
}) => {
  const styles = {
    success: "bg-emerald-50 border border-emerald-100 text-emerald-800",
    warning: "bg-amber-50 border border-amber-100 text-amber-800",
    danger: "bg-rose-50 border border-rose-100 text-rose-700",
    info: "bg-sky-50 border border-sky-100 text-sky-800",
    neutral: "bg-slate-50 border border-slate-200 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
