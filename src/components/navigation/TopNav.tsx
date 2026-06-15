import React from 'react';
import { Search } from 'lucide-react';
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
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:hidden">
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
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:text-white"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPage("signup")}
          className="h-10 rounded-lg bg-slate-100 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-950"
        >
          Start
        </button>
      )}
    </header>

    <nav className="fixed top-0 left-0 z-50 hidden h-[72px] w-full select-none items-center border-b border-slate-800 bg-slate-950 px-8 md:flex">
      <div className="flex-shrink-0 w-[240px] flex items-center">
        <button
          type="button"
          onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
          className="text-sm font-bold tracking-[0.2em] text-[#f0f3fa] cursor-pointer border-none bg-transparent p-0"
        >
          STOCKSTORY<span className="text-[#2962ff]">.INDIA</span>
        </button>
      </div>

      {isAuthenticated && user ? (
        <>
          <div className="flex-1 flex justify-center max-w-[620px] mx-auto">
            <button
              onClick={triggerSearch}
              className="w-full h-11 bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 rounded-lg flex items-center px-5 gap-3 cursor-pointer text-left focus:outline-none transition"
            >
              <Search className="w-4 h-4 text-[#787b86]" />
              <span className="text-xs text-[#787b86] font-normal">
                Search stocks, companies or sectors (Ctrl+K)
              </span>
            </button>
          </div>

          <div className="flex-shrink-0 flex items-center gap-4 ml-auto">
            <ProfileButton />
          </div>
        </>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-7 ml-auto">
          <button 
            onClick={() => setPage("about")}
            className="text-sm font-bold text-[#d1d4dc] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            About
          </button>
          <button 
            onClick={() => setPage("landing")}
            className="text-sm font-bold text-[#d1d4dc] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            Home
          </button>
          <button 
            onClick={() => setPage("login")}
            className="text-sm font-bold text-[#d1d4dc] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            Sign in
          </button>
          <button 
            onClick={() => setPage("signup")}
            className="px-5 py-2.5 bg-slate-100 text-slate-950 font-bold rounded-lg hover:bg-white transition text-sm cursor-pointer"
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
