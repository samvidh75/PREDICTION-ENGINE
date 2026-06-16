import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}) => {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700";

  const variants: Record<string, string> = {
    primary: "bg-emerald-900 text-white hover:bg-emerald-800 border border-emerald-900 shadow-sm",
    secondary: "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-white",
    ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent",
    danger: "bg-red-50 border border-red-100 text-red-700 hover:bg-red-100",
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
