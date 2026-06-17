import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg" | "none";
  hover?: boolean;
  glass?: boolean;
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
  glass = false,
}) => {
  const Comp = onClick ? "button" : "div";
  const glassStyles = "bg-white/75 backdrop-blur-glass border border-white/50 shadow-glass";
  const solidStyles = "bg-white border border-slate-200/60 shadow-card";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`w-full rounded-xl text-left text-slate-900 transition-all ${
        paddingStyles[padding]
      } ${glass ? glassStyles : solidStyles} ${
        onClick || hover ? "cursor-pointer hover:-translate-y-px card-lift" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export default Card;
