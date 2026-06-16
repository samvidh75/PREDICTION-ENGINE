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
  const baseStyle = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700";
  
  const variantStyles = {
    primary: "bg-slate-950 text-white hover:bg-slate-800 border border-slate-950 shadow-[0_1px_1px_rgba(15,23,42,0.08)]",
    secondary: "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200",
    outline: "bg-transparent border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white",
    ghost: "bg-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 border border-transparent",
    danger: "bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
