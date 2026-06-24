import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';
import { NavLink } from './NavLink';
import StockStoryLogo from '../brand/StockStoryLogo';

export const TopNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndices, setExpandedIndices] = useState(false);

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

  const handleLiveSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(window.location.search);
    params.set("page", "search");
    if (value.trim()) params.set("q", value.trim()); else params.delete("q");
    window.history.replaceState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex h-14 min-h-14 items-center justify-between gap-2 border-b border-[var(--c-border)] bg-white px-3 safe-area-top md:hidden"
      >
        <NavLink
          href={isAuthenticated ? "/?page=dashboard" : "/?page=landing"}
          className="shrink-0 border-none bg-transparent p-0"
        >
          <StockStoryLogo variant="lockup" size="sm" animated />
        </NavLink>

        {isAuthenticated && user ? (
          <button
            type="button"
            onClick={triggerSearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-sunken)] text-[var(--c-ink-muted)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-ink)]"
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPage("scanner")}
            className="h-9 shrink-0 rounded-[var(--r-md)] bg-[var(--c-brand)] px-3 text-xs font-medium text-white transition-colors"
          >
            Continue as guest
          </button>
        )}
      </header>

      <nav
        className="fixed top-0 left-0 z-50 hidden h-15 w-full items-center border-b border-[var(--c-border)] bg-white px-4 md:flex lg:px-8"
      >
        <div className="flex w-[180px] shrink-0 items-center lg:w-[220px]">
          <NavLink
            href={isAuthenticated ? "/?page=dashboard" : "/?page=landing"}
            className="cursor-pointer border-none bg-transparent p-0"
          >
            <StockStoryLogo variant="lockup" size="sm" animated />
          </NavLink>
        </div>

        <div className="mx-auto hidden w-full max-w-md items-center rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-sunken)] px-3 lg:flex">
          <Search className="h-4 w-4 text-[var(--c-ink-disabled)]" />
          <input value={searchQuery} onChange={(event) => handleLiveSearch(event.target.value)} placeholder="Search NSE/BSE companies…" className="h-9 w-full bg-transparent px-2 text-[13px] text-[var(--c-ink)] outline-none placeholder:text-[var(--c-ink-disabled)]" aria-label="Search NSE or BSE companies" />
        </div>

        {isAuthenticated && user ? (
          <>
            <div className="flex flex-1 items-center justify-center gap-1 lg:gap-3">
              <NavLink
                href="/?page=dashboard"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Home
              </NavLink>
              <NavLink
                href="/?page=scanner"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                AI Scanner
              </NavLink>
              <NavLink
                href="/?page=compare"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Compare
              </NavLink>
              <NavLink
                href="/?page=track"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Track
              </NavLink>
              <NavLink
                href="/?page=pricing"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Pricing
              </NavLink>
              <NavLink
                href="/?page=about"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                More
              </NavLink>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
              <button
                onClick={triggerSearch}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-sunken)] text-[var(--c-ink-muted)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-ink)]"
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
              </button>
              <ProfileButton />
            </div>
          </>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-6">
            <NavLink
              href="/?page=scanner"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Scanner
            </NavLink>
            <NavLink
              href="/?page=compare"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Compare
            </NavLink>
            <NavLink
              href="/?page=watchlist"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Watchlist
            </NavLink>
            <NavLink
              href="/?page=login"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Sign in
            </NavLink>
          </div>
        )}
      </nav>
      <div className="fixed left-0 right-0 top-14 z-40 flex h-9 items-center overflow-hidden border-b border-[var(--c-border)] bg-white px-3 text-[10px] md:top-[60px] lg:px-8">
        <span className="mr-5 flex shrink-0 items-center gap-1.5 font-bold text-slate-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />NSE · Live</span>
        <div className="flex min-w-max flex-1 items-center justify-around gap-8">
          {([["Nifty 50", "+0.62%"], ["Sensex", "+0.58%"], ["Nifty Bank", "+0.41%"], ["Nifty IT", "−0.18%"]] as const).map(([name, change], i) => (
            <span key={name} className={`font-semibold text-slate-600 ${i >= 2 && !expandedIndices ? "max-[479px]:hidden" : ""}`}>
              {name} <b className={change.startsWith("+") ? "text-emerald-600" : "text-red-600"}>{change}</b>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setExpandedIndices(true)}
            className={`hidden max-[479px]:block text-xs text-blue-600 font-semibold whitespace-nowrap ${expandedIndices ? "hidden" : ""}`}
          >
            +{2} more
          </button>
        </div>
      </div>
    </>
  );
};

export default TopNav;
