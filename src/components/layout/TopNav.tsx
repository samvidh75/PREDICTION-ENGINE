import { useState } from "react";
import { useLocation } from "react-router-dom";
import NavLink from "../../shared/ui/NavLink";

const NAV_LINKS = [
  { label: "Research", href: "/", dropdown: true },
  { label: "Scanner", href: "/scanner" },
  { label: "Compare", href: "/compare" },
  { label: "Watchlist", href: "/watchlist" },
];

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const active = location.pathname === "/" ? "/" : location.pathname;

  return (
    <>
      <nav className="sticky top-0 z-50 flex h-[56px] items-center gap-0 border-b border-[#e8e8e8] bg-white px-4 md:px-6">
        <NavLink href="/" className="flex flex-shrink-0 items-center gap-[9px] no-underline">
          <img src="/logo-mark.svg" width={34} height={34} alt="" />
          <div>
            <div className="text-[16px] font-[800] leading-none tracking-[-0.5px] text-[#0a0a0a]">StockStory</div>
            <div className="mt-[2px] text-[8px] font-[600] tracking-[0.16em] text-[#999]">INDIA</div>
          </div>
        </NavLink>

        <div className="ml-8 hidden gap-0.5 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/" ? active === "/" : active.startsWith(link.href);
            return (
              <NavLink
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 whitespace-nowrap rounded-[7px] border-b-2 px-3.5 py-1.5 text-[14px] no-underline transition-all"
                style={{
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#0a0a0a" : "#555",
                  borderBottomColor: isActive ? "#1a7f4b" : "transparent",
                }}
              >
                {link.label}
                {link.dropdown ? <span className="text-[9px] opacity-40">▾</span> : null}
              </NavLink>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <NavLink
            href="/search"
            aria-label="Search"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] bg-[#f5f5f5] text-[#888] no-underline"
          >
            ⌕
          </NavLink>
          <NavLink
            href="/login"
            className="hidden h-[34px] items-center rounded-[8px] border border-[#e8e8e8] bg-white px-4 text-[13px] font-[500] text-[#2d2d2d] no-underline md:flex"
          >
            Sign in
          </NavLink>
          <NavLink
            href="/register"
            className="flex h-[34px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] border-0 bg-[#0a0a0a] px-4 text-[13px] font-[600] text-white no-underline"
          >
            <span className="hidden md:inline">Start Free Trial</span>
            <span className="md:hidden">Get started</span>
            <span className="text-[12px]">↗</span>
          </NavLink>
          <button
            aria-label="Toggle menu"
            className="flex h-8 w-8 items-center justify-center text-[18px] text-[#555] md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="fixed bottom-0 left-0 right-0 top-[56px] z-[49] flex flex-col overflow-y-auto border-t border-[#e8e8e8] bg-white px-6 py-4 md:hidden">
          <div className="text-[11px] font-[600] tracking-[0.08em] text-[#999] uppercase px-1 py-2">
            Navigation
          </div>
          {[
            { label: "Home", href: "/" },
            { label: "Scanner", href: "/scanner" },
            { label: "Search", href: "/search" },
            { label: "Compare", href: "/compare" },
            { label: "Watchlist", href: "/watchlist" },
            { label: "Portfolio", href: "/portfolio" },
            { label: "Alerts", href: "/alerts" },
          ].map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block border-b border-[#f5f5f5] py-3.5 text-[17px] font-[500] text-[#2d2d2d] no-underline"
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </>
  );
}
