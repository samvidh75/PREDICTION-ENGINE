import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
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
        className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        aria-expanded={open}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#2962ff] to-[#8f5cff]" />
        <span className="text-xs font-medium text-white truncate max-w-[120px]">
          {user.displayName || user.email || 'Account'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-[#090b0d] p-2 shadow-2xl">
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-50"
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
