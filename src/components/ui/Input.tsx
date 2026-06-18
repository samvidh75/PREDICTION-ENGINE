import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  glass?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, glass = false, className = "", ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="w-full text-left">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[#9AA7B5]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`h-10 w-full rounded-lg text-sm text-[#E6EDF3] placeholder-[#64748B] transition-colors focus:border-[#2962FF] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/20 disabled:bg-[#111827] disabled:text-[#64748B] disabled:cursor-not-allowed ${
            glass
              ? "border border-[rgba(148,163,184,0.16)] bg-[#111827]"
              : "bg-[#111827] border border-[rgba(148,163,184,0.16)]"
          } px-3 ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-[#FCA5A5]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
