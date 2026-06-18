import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface SpatialModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export function SpatialModal({ open, onClose, title, subtitle, children, className = "", maxWidth = "max-w-2xl" }: SpatialModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
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
      setTimeout(() => modalRef.current?.focus(), 80);
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
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative w-full max-h-[88vh] overflow-y-auto
          rounded-t-[32px] sm:rounded-[32px]
          bg-[#0D1117] border border-white/[0.08]
          shadow-[0_24px_80px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]
          transition-all duration-300 ease-out
          ${maxWidth}
          ${className}
        `}
        style={{ transform: "translateZ(0)" }}
      >
        {/* Specular highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.06] bg-[#0D1117] px-6 py-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-base font-semibold text-[#E6EDF3]" id="spatial-modal-title">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-[#8B949E]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#8B949E] hover:bg-white/[0.10] hover:text-[#E6EDF3] transition-all duration-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5" id="spatial-modal-desc">
          {children}
        </div>
      </div>
    </div>
  );
}
