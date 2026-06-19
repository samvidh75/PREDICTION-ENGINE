import React, { useRef, useEffect } from "react";
import { Search } from "lucide-react";

interface CommandSurfaceProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
  className?: string;
  large?: boolean;
  icon?: React.ReactNode;
}

export default function CommandSurface({
  value,
  onChange,
  onSubmit,
  placeholder = "Search companies or sectors...",
  autoFocus = false,
  ariaLabel = "Search",
  className = "",
  large = false,
  icon,
}: CommandSurfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div
      className={`relative w-full rounded-2xl bg-[#0D1117]/75 backdrop-blur-glassLg border border-white/60 shadow-lg transition-all duration-200 focus-within:shadow-xl focus-within:border-accent-primary/30 focus-within:ring-2 focus-within:ring-accent-primary/10 ${
        large ? "py-1" : ""
      } ${className}`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)" }}
    >
      <div className="flex items-center gap-3 px-4">
        {icon || <Search className={`shrink-0 ${large ? "h-5 w-5" : "h-4 w-4"} text-ink-muted`} />}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) onSubmit();
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={`w-full bg-transparent text-ink placeholder-ink-muted outline-none ${
            large ? "h-14 text-lg" : "h-11 text-sm"
          }`}
        />
      </div>
    </div>
  );
}
