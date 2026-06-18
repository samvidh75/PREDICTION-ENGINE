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
        className="fixed top-0 left-0 right-0 z-50 flex h-14 min-h-14 items-center justify-between gap-2 px-3 safe-area-top md:hidden"
        style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}
      >
        <button
          type="button"
          onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
          className="max-w-[60%] shrink truncate border-none bg-transparent p-0 text-left text-[13px] font-semibold tracking-[0.08em]"
          style={{ color: "#0f1419" }}
        >
          StockStory<span style={{ color: "#1a6e4a" }}>.India</span>
        </button>

        {isAuthenticated && user ? (
          <button
            type="button"
            onClick={triggerSearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm border border-white/40"
            style={{ color: "#8b98a5" }}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPage("signup")}
            className="h-9 shrink-0 rounded-xl px-3 text-xs font-medium text-white transition hover:opacity-90"
            style={{ background: "#1a6e4a" }}
          >
            Get started
          </button>
        )}
      </header>

      <nav
        className="fixed top-0 left-0 z-50 hidden h-15 w-full items-center px-4 md:flex lg:px-8"
        style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}
      >
        <div className="flex w-[180px] shrink-0 items-center lg:w-[220px]">
          <button
            type="button"
            onClick={() => setPage(isAuthenticated ? "dashboard" : "landing")}
            className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold tracking-[0.08em]"
            style={{ color: "#0f1419" }}
          >
            StockStory<span style={{ color: "#1a6e4a" }}>.India</span>
          </button>
        </div>

        {isAuthenticated && user ? (
          <>
            <div className="mx-auto flex max-w-sm flex-1 justify-center lg:max-w-md">
              <button
                onClick={triggerSearch}
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-xl bg-white/65 px-3 text-left transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ border: "1px solid rgba(255,255,255,0.5)", backdropFilter: "blur(12px)", outlineColor: "#1a6e4a" }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "#8b98a5" }} />
                <span className="truncate text-sm" style={{ color: "#8b98a5" }}>
                  Search companies or sectors
                </span>
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
              <ProfileButton />
            </div>
          </>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-6">
            <button
              onClick={() => setPage("rankings")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium transition-colors hover:opacity-80 lg:text-sm"
              style={{ color: "#536471" }}
            >
              Rankings
            </button>
            <button
              onClick={() => setPage("predictions")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium transition-colors hover:opacity-80 lg:text-sm"
              style={{ color: "#536471" }}
            >
              Signals
            </button>
            <button
              onClick={() => setPage("about")}
              className="hidden cursor-pointer border-none bg-transparent text-xs font-medium transition-colors hover:opacity-80 sm:inline lg:text-sm"
              style={{ color: "#536471" }}
            >
              About
            </button>
            <button
              onClick={() => setPage("login")}
              className="cursor-pointer border-none bg-transparent text-xs font-medium transition-colors hover:opacity-80 lg:text-sm"
              style={{ color: "#536471" }}
            >
              Sign in
            </button>
            <button
              onClick={() => setPage("signup")}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 lg:px-5 lg:text-sm"
              style={{ background: "#1a6e4a" }}
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
