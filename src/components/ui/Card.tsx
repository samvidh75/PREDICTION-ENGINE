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
      className={`w-full rounded-lg border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50" : ""
      } ${className}`}
    >
      {children}
    </Comp>
  );
};

export default Card;
