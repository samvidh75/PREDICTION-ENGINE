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
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary active:scale-[0.97]";

  const variants: Record<string, string> = {
    primary: "bg-accent-primary text-white hover:bg-accent-hover border border-accent-primary shadow-sm",
    secondary: glass
      ? "bg-white/70 backdrop-blur-glass text-slate-700 hover:bg-white/90 border border-white/50 shadow-glass"
      : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 shadow-sm",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-white/50",
    ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 border border-transparent",
    danger: "bg-red-50/80 backdrop-blur-sm border border-red-100/60 text-red-700 hover:bg-red-100",
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
