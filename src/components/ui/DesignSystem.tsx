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
      type={onClick ? "button" : undefined}
      className={`w-full rounded-lg border border-slate-200 bg-white p-4 text-left text-slate-900 shadow-sm transition ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50" : ""
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
      type={onClick ? "button" : undefined}
      className={`w-full rounded-lg border border-slate-200 bg-white p-6 text-left text-slate-900 shadow-sm transition ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50" : ""
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
      type={onClick ? "button" : undefined}
      className={`w-full rounded-lg border border-slate-200 bg-white p-8 text-left text-slate-900 shadow-sm transition ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50" : ""
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
  const baseStyle = "inline-flex items-center justify-center font-semibold transition rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:ring-offset-white";
  
  const variantStyles = {
    primary: "bg-slate-950 text-white hover:bg-slate-800 border border-slate-950",
    secondary: "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-transparent",
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
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-xs font-medium text-slate-600">{subtitle}</p>
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
    <div className={`w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
            {headers.map((h, i) => (
              <th key={i} className="p-4 uppercase tracking-wider font-semibold font-mono">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
};
