import { useEffect, useState } from "react";
import Logo from "../brand/Logo";

const navLinks = [
  { label: "Research", hasArrow: true, href: "/" },
  { label: "Scanner", hasArrow: false, href: "/?page=scanner" },
  { label: "Compare", hasArrow: false, href: "/?page=compare" },
  { label: "Watchlist", hasArrow: false, href: "/?page=watchlist" },
  { label: "Pricing", hasArrow: false, href: "/pricing" },
  { label: "Learn", hasArrow: true, href: "/learn" },
];

function isActive(href: string): boolean {
  if (typeof window === "undefined") return href === "/";
  const url = new URL(window.location.href);
  if (href === "/") return !url.searchParams.get("page") && url.pathname === "/";
  return window.location.href.includes(href);
}

export function navigate(page: string, symbol?: string) {
  const href = page === "home" ? "/" : `/?page=${page}${symbol ? `&id=${encodeURIComponent(symbol)}` : ""}`;
  window.history.pushState({}, "", href);
  window.dispatchEvent(new Event("urlchange"));
}

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLocationKey] = useState(0);

  useEffect(() => {
    const sync = () => setLocationKey((value) => value + 1);
    window.addEventListener("popstate", sync);
    window.addEventListener("urlchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("urlchange", sync);
    };
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 flex h-[56px] items-center gap-0 border-b border-[#e8e8e8] bg-white px-4 md:px-7">
        <Logo />
        <div className="ml-8 hidden items-center gap-0 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <a
                key={link.label}
                href={link.href}
                className={`relative flex items-center gap-1 rounded-[7px] px-3.5 py-1.5 text-[14px] font-[500] text-[#555] no-underline transition-colors hover:bg-[#f5f5f5] hover:text-[#0a0a0a] ${
                  active ? "font-[600] text-[#0a0a0a]" : ""
                } ${active && link.label === "Scanner" ? "after:absolute after:bottom-[-13px] after:left-3 after:right-3 after:h-[2px] after:bg-[#1a7f4b]" : ""}`}
              >
                {link.label}
                {link.hasArrow ? <span className="ml-0.5 text-[10px] opacity-40">▾</span> : null}
              </a>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <button
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e8e8e8] bg-[#f5f5f5] text-[#888] transition-colors hover:text-[#0a0a0a] md:h-8 md:w-8"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button className="hidden h-[34px] items-center rounded-[8px] border border-[#e8e8e8] bg-white px-4 text-[13px] font-[500] text-[#2d2d2d] transition-colors hover:border-[#ccc] md:flex">
            Sign in
          </button>
          <button className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-[8px] bg-[#0a0a0a] px-4 text-[13px] font-[600] text-white transition-colors hover:bg-[#222] md:h-[34px]">
            Start Free Trial
            <span className="text-[12px]">↗</span>
          </button>
          <button
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center text-[#555] md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
        </div>
      </nav>
      {menuOpen ? (
        <div className="z-40 flex flex-col gap-1 border-b border-[#e8e8e8] bg-white px-5 py-4 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="border-b border-[#f5f5f5] py-2.5 text-[15px] font-[500] text-[#555] no-underline last:border-0"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </>
  );
}
