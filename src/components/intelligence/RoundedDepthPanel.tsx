import React from "react";

interface RoundedDepthPanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  variant?: "default" | "elevated" | "modal";
}

const PADDING = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const VARIANT_STYLE = {
  default: "border border-white/5 bg-[#0D1117] shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
  elevated: "border border-white/[0.06] bg-[#0D1117] shadow-[0_4px_12px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]",
  modal: "border border-white/10 bg-[#0D1117] shadow-[0_12px_48px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)]",
};

export function RoundedDepthPanel({ children, className = "", padding = "md", variant = "default" }: RoundedDepthPanelProps) {
  return (
    <div className={`rounded-[22px] ${VARIANT_STYLE[variant]} ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
