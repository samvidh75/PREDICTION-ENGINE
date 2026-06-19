import React from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';

export const TopNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    if (pageKey !== "search") params.delete("q");
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
      <header
        className="fixed top-0 left-0 right-0 z-50 flex h-14 min-h-14 items-center justify-between gap-2 px-3 safe-area-top md:hidden bg-[#080C10] border-b border-white/[0.06]"
      >
        <button
          type="button"
          onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
          className="max-w-[60%] shrink truncate border-none bg-transparent p-0 text-left text-[13px] font-semibold tracking-tight text-[#E6EDF3]"
        >
          StockStory<span className="text-[#16A34A]">.</span>India
        </button>

        {isAuthenticated && user ? (
          <button
            type="button"
            onClick={triggerSearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#9AA7B5] hover:text-[#E6EDF3]"
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPage("signup")}
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-medium text-white bg-[#2962FF] hover:bg-[#3B71FF] transition-colors"
          >
            Get started
          </button>
        )}
      </header>

      <nav
        className="fixed top-0 left-0 z-50 hidden h-15 w-full items-center px-4 md:flex lg:px-8 bg-[#080C10] border-b border-white/[0.06]"
      >
        <div className="flex w-[180px] shrink-0 items-center lg:w-[220px]">
          <button
            type="button"
            onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
            className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold tracking-tight text-[#E6EDF3]"
          >
            StockStory<span className="text-[#16A34A]">.</span>India
          </button>
        </div>

        {isAuthenticated && user ? (
          <>
            <div className="flex flex-1 items-center justify-center gap-1 lg:gap-3">
              <button
                onClick={() => setPage("dashboard")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage("search")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Scanner
              </button>
              <button
                onClick={() => setPage("rankings")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Rankings
              </button>
              <button
                onClick={() => setPage("compare")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Compare
              </button>
              <button
                onClick={() => setPage("watchlist")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Watchlist
              </button>
              <button
                onClick={() => setPage("portfolio")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Portfolio
              </button>
              <button
                onClick={() => setPage("methodology")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Methodology
              </button>
              <button
                onClick={() => setPage("settings")}
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
              >
                Settings
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
              <button
                onClick={triggerSearch}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#9AA7B5] hover:text-[#E6EDF3]"
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
              </button>
              <ProfileButton />
            </div>
          </>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-6">
            <button
              onClick={() => setPage("scanner")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
            >
              Scanner
            </button>
            <button
              onClick={() => setPage("methodology")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
            >
              Research Standards
            </button>
            <button
              onClick={() => setPage("about")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
            >
              About
            </button>
            <button
              onClick={() => setPage("login")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors lg:text-sm"
            >
              Sign in
            </button>
            <button
              onClick={() => setPage("signup")}
              className="cursor-pointer rounded-lg bg-[#2962FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors lg:px-5 lg:text-sm"
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
