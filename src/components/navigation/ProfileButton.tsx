import React, { useState, useRef, useEffect } from "react";
import { LogOut, User, Settings, FileText, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { productNavigate } from "../product/ProductUI";

export const ProfileButton: React.FC = () => {
  const { user, logout, isConnecting } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[#9AA7B5] transition-all hover:border-[rgba(41,98,255,0.3)] hover:bg-[rgba(41,98,255,0.08)] hover:text-[#E6EDF3]"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(41,98,255,0.12)]">
          <User className="h-3.5 w-3.5 text-[#2962FF]" />
        </span>
        <span className="hidden max-w-[120px] truncate text-xs font-medium lg:block">
          {user.displayName || user.email || "Account"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-[rgba(148,163,184,0.16)] bg-[#0D1117] shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
          <div className="border-b border-[rgba(148,163,184,0.08)] px-4 py-3">
            <div className="text-xs font-medium text-[#E6EDF3]">{user.displayName || "User"}</div>
            {user.email && <div className="mt-0.5 text-[10px] text-[#64748B]">{user.email}</div>}
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => { setOpen(false); productNavigate("settings"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#9AA7B5] transition-colors hover:bg-[rgba(41,98,255,0.08)] hover:text-[#E6EDF3]"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); productNavigate("terms"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#9AA7B5] transition-colors hover:bg-[rgba(41,98,255,0.08)] hover:text-[#E6EDF3]"
            >
              <FileText className="h-3.5 w-3.5" />
              Terms & Disclosures
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); productNavigate("methodology"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#9AA7B5] transition-colors hover:bg-[rgba(41,98,255,0.08)] hover:text-[#E6EDF3]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Research Standards
            </button>
            <div className="h-px bg-white/[0.06] my-1" />
            <button
              type="button"
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
