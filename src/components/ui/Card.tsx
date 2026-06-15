import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingStyles = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
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
      className={`w-full rounded-lg border border-slate-200 bg-white text-left text-slate-900 shadow-sm transition ${
        paddingStyles[padding]
      } ${
        onClick || hover ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export default Card;
