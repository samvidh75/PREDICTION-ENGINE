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
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[56px] items-center justify-between bg-white/85 backdrop-blur-glassLg border-b border-white/50 shadow-glass px-4 md:hidden">
      <button
        type="button"
        onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
        className="border-none bg-transparent p-0 text-left text-[12px] font-semibold tracking-[0.1em] text-slate-900"
      >
          StockStory<span className="text-accent-primary">.India</span>
      </button>

      {isAuthenticated && user ? (
        <button
          type="button"
          onClick={triggerSearch}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 text-slate-500 transition hover:bg-white/90"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPage("signup")}
          className="h-9 rounded-xl bg-accent-primary px-4 text-xs font-medium text-white hover:bg-accent-hover transition"
        >
          Start
        </button>
      )}
    </header>

    <nav className="fixed top-0 left-0 z-50 hidden h-[60px] w-full items-center bg-white/85 backdrop-blur-glassLg border-b border-white/50 shadow-glass px-8 md:flex">
      <div className="flex w-[220px] shrink-0 items-center">
        <button
          type="button"
          onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
          className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold tracking-[0.1em] text-slate-900"
        >
        StockStory<span className="text-accent-primary">.India</span>
        </button>
      </div>

      {isAuthenticated && user ? (
        <>
          <div className="mx-auto flex max-w-md flex-1 justify-center">
            <button
              onClick={triggerSearch}
              className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass px-3.5 text-left transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-sm text-slate-400">
                Search companies or sectors
              </span>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ProfileButton />
          </div>
        </>
      ) : (
        <div className="ml-auto flex shrink-0 items-center gap-6">
          <button
            onClick={() => setPage("rankings")}
            className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Rankings
          </button>
          <button
            onClick={() => setPage("predictions")}
            className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Signals
          </button>
          <button 
            onClick={() => setPage("about")}
            className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            About
          </button>
          <button 
            onClick={() => setPage("login")}
            className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Sign in
          </button>
          <button 
            onClick={() => setPage("signup")}
            className="cursor-pointer rounded-xl bg-accent-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
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
