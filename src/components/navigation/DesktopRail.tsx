import React, { useMemo } from "react";
import { Home, BarChart3, Search, Eye, ArrowLeftRight, DollarSign, BookOpen, Settings } from "lucide-react";
import { NavLink } from "./NavLink";
import StockStoryLogo from "../brand/StockStoryLogo";

interface RailItem {
  page: string;
  label: string;
  icon: React.ReactNode;
  primary: boolean;
}

const RAIL_ITEMS: RailItem[] = [
  { page: "dashboard", label: "Home", icon: <Home className="h-[18px] w-[18px]" />, primary: true },
  { page: "scanner", label: "AI Scanner", icon: <BarChart3 className="h-[18px] w-[18px]" />, primary: true },
  { page: "search", label: "Search", icon: <Search className="h-[18px] w-[18px]" />, primary: true },
  { page: "track", label: "Track", icon: <Eye className="h-[18px] w-[18px]" />, primary: true },
  { page: "compare", label: "Compare", icon: <ArrowLeftRight className="h-[18px] w-[18px]" />, primary: false },
  { page: "pricing", label: "Pricing", icon: <DollarSign className="h-[18px] w-[18px]" />, primary: false },
  { page: "methodology", label: "Research standards", icon: <BookOpen className="h-[18px] w-[18px]" />, primary: false },
  { page: "settings", label: "Account", icon: <Settings className="h-[18px] w-[18px]" />, primary: false },
];

function useCurrentPage(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "dashboard";
    return new URLSearchParams(window.location.search).get("page") ?? "dashboard";
  }, []);
}

export default function DesktopRail(): JSX.Element {
  const currentPage = useCurrentPage();
  const primaryItems = RAIL_ITEMS.filter((i) => i.primary);
  const secondaryItems = RAIL_ITEMS.filter((i) => !i.primary);

  function itemClass(page: string): string {
    const isActive = currentPage === page;
    const isScanner = page === "scanner";
    const base = "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 hover:bg-[var(--color-surface-raised)]";
    if (isActive && isScanner) return `${base} bg-violet-50 text-violet-700 font-bold`;
    if (isActive) return `${base} bg-blue-50 text-blue-600 font-bold`;
    return `${base} text-[var(--color-text-secondary)] font-medium`;
  }

  function iconClass(page: string): string {
    const isActive = currentPage === page;
    const isScanner = page === "scanner";
    if (isActive && isScanner) return "text-violet-600";
    if (isActive) return "text-blue-600";
    return "text-[var(--color-text-muted)]";
  }

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex group fixed left-0 top-0 bottom-0 z-40 flex-col overflow-hidden transition-[width] duration-200 ease-out w-16 hover:w-[220px] bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-[1px_0_3px_rgba(15,23,42,0.04)]"
    >
      {/* Brand */}
      <div className="flex items-center h-16 px-3 shrink-0 overflow-hidden border-b border-[var(--color-border)]">
        <div className="shrink-0 group-hover:hidden block">
          <StockStoryLogo variant="mark" size="sm" />
        </div>
        <div className="hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <StockStoryLogo variant="lockup" size="sm" />
        </div>
      </div>

      {/* Primary nav items */}
      <ul className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {primaryItems.map(({ page, label, icon }) => (
          <li key={page}>
            <NavLink
              href={`/?page=${page}`}
              title={label}
              className={itemClass(page)}
              aria-current={currentPage === page ? "page" : undefined}
            >
              <span className={`grid place-items-center h-7 w-7 rounded-md shrink-0 ${iconClass(page)}`}>
                {icon}
              </span>
              <span className="text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {label}
              </span>
            </NavLink>
          </li>
        ))}

        {/* Secondary items */}
        {secondaryItems.length > 0 && (
          <li className="pt-3 mt-3 border-t border-[var(--color-border)]">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              More
            </div>
            {secondaryItems.map(({ page, label, icon }) => (
              <NavLink
                key={page}
                href={`/?page=${page}`}
                title={label}
                className={itemClass(page) + " text-[13px]"}
                aria-current={currentPage === page ? "page" : undefined}
              >
                <span className={`grid place-items-center h-7 w-7 rounded-md shrink-0 ${iconClass(page)}`}>
                  {icon}
                </span>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {label}
                </span>
              </NavLink>
            ))}
          </li>
        )}
      </ul>

      {/* Footer */}
      <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border-t border-[var(--color-border)]">
        &copy; {new Date().getFullYear()} StockStory India
      </div>
    </aside>
  );
}
