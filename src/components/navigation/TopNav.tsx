import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';

export const TopNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    if (pageKey !== "search") {
      params.delete("q");
    }
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const triggerSearch = () => {
    window.dispatchEvent(new Event("ss:open-search"));
  };

  return (
    <>
    <header className="ss-tv-neon-edge fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between border-b border-white/10 bg-black/94 px-4 backdrop-blur-xl md:hidden">
      <button
        type="button"
        onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
        className="border-none bg-transparent p-0 text-left text-[12px] font-bold uppercase tracking-[0.18em] text-[#f0f3fa]"
      >
        STOCKSTORY<span className="text-[#2962ff]">.INDIA</span>
      </button>

      {isAuthenticated && user ? (
        <button
          type="button"
          onClick={triggerSearch}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1e222d] text-[#b2b5be] shadow-[0_0_24px_rgba(41,98,255,0.14)] transition hover:border-[#2962ff]/60 hover:text-white"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPage("signup")}
          className="h-10 rounded-full bg-[#2962ff] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
        >
          Start
        </button>
      )}
    </header>

    <nav className="ss-tv-neon-edge fixed top-0 left-0 z-50 hidden h-[72px] w-full select-none items-center border-b border-white/10 bg-black/94 px-8 backdrop-blur-xl md:flex">
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
          <div className="flex-1 flex justify-center max-w-[620px] mx-auto">
            <button
              onClick={triggerSearch}
              className="w-full h-11 bg-[#1e222d] border border-white/10 hover:border-[#2962ff]/65 hover:bg-[#262b38] rounded-full flex items-center px-5 gap-3 cursor-pointer text-left focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(41,98,255,0.08)]"
            >
              <Search className="w-4 h-4 text-[#787b86]" />
              <span className="text-xs text-[#787b86] font-normal">
                Search stocks, companies or sectors (Ctrl+K)
              </span>
            </button>
          </div>

          <div className="flex-shrink-0 flex items-center gap-4 ml-auto">
            <button
              type="button"
              onClick={() => setPage("alerts")}
              className="h-11 w-11 rounded-full bg-[#1e222d] border border-white/10 hover:bg-[#262b38] hover:border-[#2962ff]/60 flex items-center justify-center transition-all cursor-pointer text-[#b2b5be] hover:text-[#f0f3fa] shadow-[0_0_24px_rgba(41,98,255,0.08)]"
            >
              <Bell className="w-4 h-4" />
            </button>
            <ProfileButton />
          </div>
        </>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-7 ml-auto">
          <button 
            onClick={() => setPage("about")}
            className="text-sm font-bold text-[#d1d4dc] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            Products
          </button>
          <button 
            onClick={() => setPage("landing")}
            className="text-sm font-bold text-[#d1d4dc] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            Markets
          </button>
          <button 
            onClick={() => setPage("login")}
            className="text-sm font-bold text-[#d1d4dc] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            Sign in
          </button>
          <button 
            onClick={() => setPage("signup")}
            className="px-5 py-2.5 bg-[#2962ff] text-white font-bold rounded-full hover:bg-[#1e53e5] transition-all text-sm cursor-pointer shadow-[0_0_28px_rgba(41,98,255,0.38)]"
          >
            Get started
          </button>
        </div>
      )}
    </nav>
    </>
  );
};

export default TopNav;
