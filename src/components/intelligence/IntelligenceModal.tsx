import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface IntelligenceModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function IntelligenceModal({ open, onClose, title, subtitle, children, className = "" }: IntelligenceModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      setTimeout(() => modalRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Intelligence detail"}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative w-full max-h-[85vh] overflow-y-auto
          rounded-t-[32px] sm:rounded-[28px]
          bg-[#0D1117] border border-white/10
          shadow-[0_12px_48px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)]
          sm:max-w-2xl
          ${className}
        `}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/5 bg-[#0D1117] px-6 py-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-base font-semibold text-[#E6EDF3]">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-[#8B949E]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3] transition-colors"
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
