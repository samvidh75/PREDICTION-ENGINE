import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg" | "none";
  hover?: boolean;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  onClick,
  padding = "md",
  hover = false,
}) => {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`w-full rounded-xl border border-slate-200/60 bg-white text-left text-slate-900 shadow-card transition-all ${
        paddingStyles[padding]
      } ${
        onClick || hover ? "cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-px" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export default Card;
