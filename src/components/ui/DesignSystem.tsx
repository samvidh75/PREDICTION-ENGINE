import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SmallCard: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  const Comp = onClick ? "button" : "div";
  return (
    // Spacing: p-4 (16px), gap-2 (8px)
    <Comp
      onClick={onClick}
      className={`text-left w-full ss-panel-subtle rounded-lg p-4 transition-all hover:border-cyan-200/20 ${
        onClick ? "cursor-pointer hover:bg-white/[0.08]" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export const MediumCard: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  const Comp = onClick ? "button" : "div";
  return (
    // Spacing: p-6 (24px)
    <Comp
      onClick={onClick}
      className={`text-left w-full ss-panel rounded-lg p-6 transition-all hover:border-cyan-200/24 ${
        onClick ? "cursor-pointer hover:bg-white/[0.08]" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export const LargeCard: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  const Comp = onClick ? "button" : "div";
  return (
    // Spacing: p-8 (32px)
    <Comp
      onClick={onClick}
      className={`text-left w-full ss-panel rounded-lg p-8 shadow-xl transition-all ${
        onClick ? "cursor-pointer hover:bg-white/[0.08]" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
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
  const baseStyle = "inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const variantStyles = {
    primary: "bg-cyan-400 text-black hover:bg-cyan-300 border border-transparent",
    secondary: "bg-white/[0.075] border border-cyan-100/12 text-white hover:bg-white/[0.12]",
    ghost: "bg-transparent text-white/60 hover:text-white hover:bg-white/5 border border-transparent",
  };

  const sizeStyles = {
    // Spacing limits: sm (h-8, px-3, 10px), md (h-10, px-4, 11px), lg (h-12, px-6, 12px)
    sm: "h-8 px-3 text-[10px]",
    md: "h-10 px-4 text-[11px]",
    lg: "h-12 px-6 text-xs",
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

interface PageHeaderProps {
  title: string;
  subtitle: string;
  primaryAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, primaryAction }) => {
  return (
    // Spacing: py-6 (24px) or py-8 (32px), mb-6 (24px)
    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-100/10 pb-6 mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-xs text-white/52 font-medium">{subtitle}</p>
      </div>
      {primaryAction && <div className="shrink-0 flex items-center">{primaryAction}</div>}
    </div>
  );
};

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const CustomTable: React.FC<TableProps> = ({ headers, children, className = "" }) => {
  return (
    <div className={`overflow-x-auto w-full ss-panel rounded-lg ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-cyan-100/10 text-white/50 font-semibold bg-white/[0.045]">
            {headers.map((h, i) => (
              <th key={i} className="p-4 uppercase tracking-wider font-semibold font-mono">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
};
