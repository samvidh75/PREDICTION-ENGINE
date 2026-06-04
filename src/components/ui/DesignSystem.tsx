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
      className={`ss-tv-panel ss-tv-neon-edge text-left w-full rounded-lg p-4 transition-all hover:border-[#2962ff]/45 ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:bg-[#10131d]" : ""
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
      className={`ss-tv-panel ss-tv-neon-edge text-left w-full rounded-xl p-6 transition-all hover:border-[#2962ff]/45 ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:bg-[#10131d]" : ""
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
      className={`ss-tv-panel ss-tv-neon-edge text-left w-full rounded-2xl p-8 shadow-xl transition-all ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:bg-[#10131d]" : ""
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
    primary: "bg-[#2962ff] text-white hover:bg-[#1e53e5] border border-transparent shadow-[0_0_28px_rgba(41,98,255,0.32)]",
    secondary: "bg-[#10131d] border border-[#2a2e39] text-[#f0f3fa] hover:bg-[#161a26] hover:border-[#2962ff]/45",
    ghost: "bg-transparent text-[#b2b5be] hover:text-[#f0f3fa] hover:bg-[#1e222d] border border-transparent",
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
    <div className="ss-tv-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#f0f3fa]">{title}</h1>
        <p className="mt-2 text-xs text-[#787b86] font-medium">{subtitle}</p>
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
    <div className={`ss-tv-panel overflow-x-auto w-full rounded-2xl ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#2a2e39] text-[#787b86] font-semibold bg-[#1e222d]">
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
