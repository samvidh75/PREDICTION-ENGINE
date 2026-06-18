import React from "react";
import { Command, Search } from "lucide-react";

interface PremiumCommandButtonProps {
  onClick: () => void;
  placeholder?: string;
  shortcut?: string;
  className?: string;
}

export function PremiumCommandButton({ onClick, placeholder = "Search symbols, companies, sectors...", shortcut = "⌘K", className = "" }: PremiumCommandButtonProps) {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm text-[#484F58] hover:border-white/10 hover:bg-white/[0.05] hover:text-[#8B949E] transition-colors ${className}`}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{placeholder}</span>
      <kbd className="hidden rounded-md border border-white/5 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[#484F58] sm:inline-block">
        {shortcut || shortcutLabel}
      </kbd>
    </button>
  );
}
