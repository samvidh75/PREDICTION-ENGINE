import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`text-left w-full rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all ${
        onClick ? "cursor-pointer hover:bg-slate-900/80 hover:border-slate-700" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export default Card;
