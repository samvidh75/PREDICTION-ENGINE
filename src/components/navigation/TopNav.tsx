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
    const params = new URLSearchParams(window.location.search);
    params.set("page", "search");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
      <button
        type="button"
        onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
        className="border-none bg-transparent p-0 text-left text-[12px] font-bold uppercase tracking-[0.18em] text-slate-950"
      >
        STOCKSTORY<span className="text-emerald-700">.INDIA</span>
      </button>

      {isAuthenticated && user ? (
        <button
          type="button"
          onClick={triggerSearch}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPage("signup")}
          className="h-10 rounded-lg bg-slate-950 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
        >
          Start
        </button>
      )}
    </header>

    <nav className="fixed top-0 left-0 z-50 hidden h-[72px] w-full select-none items-center border-b border-slate-200 bg-white px-8 md:flex">
      <div className="flex-shrink-0 w-[240px] flex items-center">
        <button
          type="button"
          onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
          className="cursor-pointer border-none bg-transparent p-0 text-sm font-bold tracking-[0.2em] text-slate-950"
        >
          STOCKSTORY<span className="text-emerald-700">.INDIA</span>
        </button>
      </div>

      {isAuthenticated && user ? (
        <>
          <div className="flex-1 flex justify-center max-w-[620px] mx-auto">
            <button
              onClick={triggerSearch}
              className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-5 text-left transition hover:border-slate-300 hover:bg-white focus:outline-none"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-normal text-slate-500">
                Search stocks, companies or sectors
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
            className="cursor-pointer border-none bg-transparent text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
          >
            About
          </button>
          <button 
            onClick={() => setPage("landing")}
            className="cursor-pointer border-none bg-transparent text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
          >
            Home
          </button>
          <button 
            onClick={() => setPage("login")}
            className="cursor-pointer border-none bg-transparent text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
          >
            Sign in
          </button>
          <button 
            onClick={() => setPage("signup")}
            className="cursor-pointer rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
