import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  glass?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  glass = false,
  children,
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2962FF] active:scale-[0.99]";

  const variants: Record<string, string> = {
    primary: "bg-[#2962FF] text-white hover:bg-[#3B71FF] border border-[#2962FF]",
    secondary: glass
      ? "border border-[rgba(148,163,184,0.16)] bg-[#111827] text-[#E6EDF3] hover:border-[#2962FF]/60"
      : "bg-[#111827] text-[#E6EDF3] hover:border-[#2962FF]/60 border border-[rgba(148,163,184,0.16)]",
    outline: "bg-transparent border border-[rgba(148,163,184,0.16)] text-[#9AA7B5] hover:text-[#E6EDF3] hover:border-[#2962FF]/60",
    ghost: "bg-transparent text-[#9AA7B5] hover:text-[#E6EDF3] hover:bg-white/[0.03] border border-transparent",
    danger: "bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] hover:bg-[#EF4444]/15",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
