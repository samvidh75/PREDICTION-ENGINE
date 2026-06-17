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
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`h-10 w-full rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            glass
              ? "glass-panel"
              : "bg-white border border-slate-200 shadow-sm"
          } px-3 ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
