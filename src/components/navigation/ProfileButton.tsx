import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProfileButton: React.FC = () => {
  const { user, logout, isConnecting } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:bg-slate-50"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
          <User className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[140px] truncate text-xs font-medium">
          {user.displayName || user.email || 'Account'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileButton;
