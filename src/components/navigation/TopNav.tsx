import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';

export const TopNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const triggerSearch = () => {
    window.dispatchEvent(new Event("ss:open-search"));
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-[72px] bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-[#2a2e39] z-50 flex items-center px-8 select-none">
      <div className="flex-shrink-0 w-[240px] flex items-center">
        <span 
          onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
          className="text-sm font-bold tracking-[0.2em] text-[#f0f3fa] cursor-pointer"
        >
          STOCKSTORY<span className="text-[#2962ff]">.INDIA</span>
        </span>
      </div>

      {isAuthenticated && user ? (
        <>
          <div className="flex-1 flex justify-center max-w-[600px] mx-auto">
            <button
              onClick={triggerSearch}
              className="w-full h-11 bg-[#131722] border border-[#2a2e39] hover:border-[#2962ff]/60 rounded-lg flex items-center px-4 gap-3 cursor-pointer text-left focus:outline-none transition-all"
            >
              <Search className="w-4 h-4 text-[#787b86]" />
              <span className="text-xs text-[#787b86] font-normal">
                Search stocks, companies or sectors (Cmd+K)...
              </span>
            </button>
          </div>

          <div className="flex-shrink-0 flex items-center gap-4 ml-auto">
            <button
              type="button"
              onClick={() => setPage("alerts")}
              className="h-11 w-11 rounded-lg bg-[#131722] border border-[#2a2e39] hover:bg-[#1e222d] flex items-center justify-center transition-all cursor-pointer text-[#b2b5be] hover:text-[#f0f3fa]"
            >
              <Bell className="w-4 h-4" />
            </button>
            <ProfileButton />
          </div>
        </>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-6 ml-auto">
          <button 
            onClick={() => setPage("about")}
            className="text-xs font-semibold text-[#b2b5be] hover:text-[#f0f3fa] bg-transparent border-none cursor-pointer uppercase tracking-wider transition-colors"
          >
            About
          </button>
          <button 
            onClick={() => setPage("login")}
            className="text-xs font-semibold text-[#b2b5be] hover:text-[#f0f3fa] bg-transparent border-none cursor-pointer uppercase tracking-wider transition-colors"
          >
            Sign in
          </button>
          <button 
            onClick={() => setPage("signup")}
            className="px-5 py-2.5 bg-[#2962ff] text-white font-semibold rounded-full hover:bg-[#1e53e5] transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            Create Account
          </button>
        </div>
      )}
    </nav>
  );
};

export default TopNav;
