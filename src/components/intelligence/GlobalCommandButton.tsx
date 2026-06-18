import React from "react";
import { Search } from "lucide-react";

interface GlobalCommandButtonProps {
  onClick: () => void;
  className?: string;
}

export function GlobalCommandButton({ onClick, className = "" }: GlobalCommandButtonProps) {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3.5 py-1.5 text-xs text-[#484F58] hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-[#8B949E] transition-all duration-200 ${className}`}
    >
      <Search className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Search or command...</span>
      <span className="sm:hidden">Search</span>
      <kbd className="hidden rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-[#484F58] sm:inline-block">
        {shortcut}
      </kbd>
    </button>
  );
}
