import React, { useCallback, useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";

interface HelpPopoverProps {
  title: string;
  children: React.ReactNode;
  storageKey?: string;
}

export const HelpPopover: React.FC<HelpPopoverProps> = ({ title, children, storageKey }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(storageKey, "dismissed");
    }
  }, [storageKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleDismiss();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleDismiss]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.03)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        aria-label="Show help"
      >
        <Info className="h-3 w-3" aria-hidden="true" />
        How to use
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="relative rounded-xl border border-[rgba(148,163,184,0.16)] bg-[var(--color-surface)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
      role="region"
      aria-label={title}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded p-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-[11px] leading-5 text-[var(--color-text-secondary)]">
        {children}
      </div>
    </div>
  );
};

export default HelpPopover;
