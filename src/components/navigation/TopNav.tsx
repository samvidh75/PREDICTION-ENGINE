import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';

export const TopNav: React.FC = () => {
  const { user } = useAuth();

  const triggerSearch = () => {
    window.dispatchEvent(new Event("ss:open-search"));
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-[72px] bg-[#020304] border-b border-white/5 z-50 flex items-center px-8 select-none">
      <div className="flex-shrink-0 w-[240px] flex items-center">
        <span className="text-sm font-bold tracking-[0.2em] text-white">
          STOCKSTORY<span className="text-cyan-400">.INDIA</span>
        </span>
      </div>

      <div className="flex-1 flex justify-center max-w-[600px] mx-auto">
        <button
          onClick={triggerSearch}
          className="w-full h-11 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center px-4 gap-3 cursor-pointer text-left focus:outline-none transition-all"
        >
          <Search className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/40 font-normal">
            Search stocks, companies or sectors (Cmd+K)...
          </span>
        </button>
      </div>

      <div className="flex-shrink-0 flex items-center gap-4 ml-auto">
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("page", "alerts");
            window.history.pushState({}, "", `?${params.toString()}`);
            window.dispatchEvent(new Event("urlchange"));
          }}
          className="h-11 w-11 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer text-white/60 hover:text-white"
        >
          <Bell className="w-4 h-4" />
        </button>
        {user && <ProfileButton />}
      </div>
    </nav>
  );
};

export default TopNav;
