import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface SpatialSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  side?: "right" | "bottom";
}

export function SpatialSheet({ open, onClose, title, subtitle, children, className = "", side = "right" }: SpatialSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Tab" && sheetRef.current) {
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      setTimeout(() => sheetRef.current?.focus(), 80);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: isMobile ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Sheet"}
    >
      {!isMobile && (
        <div
          className="fixed inset-0"
          style={{ backdropFilter: "blur(4px)" }}
          aria-hidden="true"
        />
      )}
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={`
          fixed
          ${isMobile || side === "bottom"
            ? "inset-x-0 bottom-0 rounded-t-[32px] max-h-[85vh]"
            : "inset-y-0 right-0 rounded-l-[32px] w-full max-w-lg"
          }
          overflow-y-auto
          bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)]
          shadow-[0_24px_80px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]
          transition-all duration-300 ease-out
          ${className}
        `}
        style={{ transform: "translateZ(0)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(148,163,184,0.1)] to-transparent" />

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(148,163,184,0.12)] bg-[var(--color-surface)] px-6 py-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(15,23,42,0.06)] text-[var(--color-text-secondary)] hover:bg-[rgba(15,23,42,0.10)] hover:text-[var(--color-text-primary)] transition-all duration-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
