import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function GlassModal({
  open,
  onClose,
  title,
  children,
  className = "",
  maxWidth = "max-w-sm",
}: GlassModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    return () => prev?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.12)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} rounded-2xl bg-white/85 backdrop-blur-glassLg border border-white/60 shadow-depth ${className}`}
        style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)" }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/60 text-ink-muted hover:bg-white/80 hover:text-ink transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className={title ? "px-6 pb-6" : "p-6"}>
          {children}
        </div>
      </div>
    </div>
  );
}
