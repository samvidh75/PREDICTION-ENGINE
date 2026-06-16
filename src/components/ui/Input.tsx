import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition-colors focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
