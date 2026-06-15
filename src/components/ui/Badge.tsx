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
    success: "bg-emerald-950/40 border border-emerald-800 text-emerald-300",
    warning: "bg-amber-950/40 border border-amber-800 text-amber-300",
    danger: "bg-rose-950/40 border border-rose-800 text-rose-300",
    info: "bg-blue-950/40 border border-blue-800 text-blue-300",
    neutral: "bg-slate-800 border border-slate-700 text-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
