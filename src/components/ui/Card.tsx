import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingStyles = {
  sm: "p-3.5",
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
      className={`w-full rounded-lg border border-slate-200/80 bg-white text-left text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition ${
        paddingStyles[padding]
      } ${
        onClick || hover ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/80" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export default Card;
