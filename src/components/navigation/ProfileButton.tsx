import React, { useState, useRef, useEffect, useCallback } from "react";
import { LogOut, Settings, FileText, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { productNavigate } from "../product/ProductUI";
import { trapFocus } from "../../services/ui/focusTrap";

export const ProfileButton: React.FC = () => {
  const { user, logout, isConnecting } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key === "Tab" && menuRef.current) { e.preventDefault(); trapFocus(menuRef.current, e); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!user) return null;
  const initials = (user.displayName || user.email || "SM")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SM";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white px-1.5 py-1 text-[var(--c-ink-secondary)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-ink)]"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface-sunken)] text-[12px] font-medium text-[var(--c-ink-secondary)]">
          {initials}
        </span>
      </button>

      {open && (
        <div ref={menuRef} className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[rgba(148,163,184,0.16)] bg-[var(--color-surface)] shadow-[0_18px_48px_rgba(0,0,0,0.24)]" role="menu" aria-label="Account options">
          <div className="border-b border-[rgba(148,163,184,0.08)] px-4 py-3">
            <div className="text-xs font-medium text-[var(--color-text-primary)]">{user.displayName || "User"}</div>
            {user.email && <div className="mt-0.5 text-[10px] text-[#64748B]">{user.email}</div>}
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); productNavigate("settings"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(41,98,255,0.08)] hover:text-[var(--color-text-primary)]"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); productNavigate("terms"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(41,98,255,0.08)] hover:text-[var(--color-text-primary)]"
            >
              <FileText className="h-3.5 w-3.5" />
              Terms & Disclosures
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); productNavigate("methodology"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(41,98,255,0.08)] hover:text-[var(--color-text-primary)]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Research Standards
            </button>
            <div className="h-px bg-white/[0.06] my-1" />
            <button
              type="button"
              role="menuitem"
              disabled={isConnecting}
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#EF4444] transition-colors hover:bg-[rgba(239,68,68,0.08)] disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileButton;
