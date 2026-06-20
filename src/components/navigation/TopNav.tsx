import React from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';
import { NavLink } from './NavLink';

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
        className="fixed top-0 left-0 right-0 z-50 flex h-14 min-h-14 items-center justify-between gap-2 px-3 safe-area-top md:hidden bg-[var(--color-surface)] border-b border-[var(--color-border)]"
      >
        <NavLink
          href={isAuthenticated ? "/?page=dashboard" : "/?page=landing"}
          className="max-w-[60%] shrink truncate border-none bg-transparent p-0 text-left text-[13px] font-semibold tracking-tight text-[var(--color-text-primary)]"
        >
          StockStory<span className="text-[#16A34A]">.</span>India
        </NavLink>

        {isAuthenticated && user ? (
          <button
            type="button"
            onClick={triggerSearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-all hover:border-[rgba(41,98,255,0.3)] hover:bg-[rgba(41,98,255,0.08)] hover:text-[var(--color-text-primary)]"
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
        className="fixed top-0 left-0 z-50 hidden h-15 w-full items-center px-4 md:flex lg:px-8 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
      >
        <div className="flex w-[180px] shrink-0 items-center lg:w-[220px]">
          <NavLink
            href={isAuthenticated ? "/?page=dashboard" : "/?page=landing"}
            className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold tracking-tight text-[var(--color-text-primary)]"
          >
            StockStory<span className="text-[#16A34A]">.</span>India
          </NavLink>
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
                Scanner
              </NavLink>
              <NavLink
                href="/?page=rankings"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Rankings
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
                href="/?page=portfolio"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Portfolio
              </NavLink>
              <NavLink
                href="/?page=methodology"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Methodology
              </NavLink>
              <NavLink
                href="/?page=settings"
                className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
              >
                Settings
              </NavLink>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
              <button
                onClick={triggerSearch}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-all hover:border-[rgba(41,98,255,0.3)] hover:bg-[rgba(41,98,255,0.08)] hover:text-[var(--color-text-primary)]"
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
              href="/?page=about"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Product
            </NavLink>
            <NavLink
              href="/?page=methodology"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Research Standards
            </NavLink>
            <NavLink
              href="/?page=login"
              className="cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors lg:text-sm"
            >
              Sign in
            </NavLink>
            <NavLink
              href="/?page=signup"
              className="cursor-pointer rounded-lg bg-[#2962FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors lg:px-5 lg:text-sm"
            >
              Get started
            </NavLink>
          </div>
        )}
      </nav>
    </>
  );
};

export default TopNav;
