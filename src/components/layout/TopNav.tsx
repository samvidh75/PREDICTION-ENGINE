import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Research", href: "/", dropdown: true },
  { label: "Scanner", href: "/?page=scanner" },
  { label: "Compare", href: "/?page=compare" },
  { label: "Watchlist", href: "/?page=watchlist" },
  { label: "Pricing", href: "/pricing" },
  { label: "Learn", href: "/learn", dropdown: true },
];

function isCurrentPage(href: string): boolean {
  if (typeof window === "undefined") return href === "/";
  const url = new URL(window.location.href);
  if (href === "/") return url.pathname === "/" && !url.searchParams.get("page");
  if (href.startsWith("/?page=")) return url.search === href.replace("/", "");
  return url.pathname === href;
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
      <nav className="sticky top-0 z-50 flex h-[56px] items-center gap-0 border-b border-[#e8e8e8] bg-white px-4 md:px-6">
        <a href="/" className="flex flex-shrink-0 items-center gap-[9px] no-underline">
          <img src="/logo-mark.svg" width={34} height={34} alt="" />
          <div>
            <div className="text-[16px] font-[800] leading-none tracking-[-0.5px] text-[#0a0a0a]">StockStory</div>
            <div className="mt-[2px] text-[8px] font-[600] tracking-[0.16em] text-[#999]">INDIA</div>
          </div>
        </a>

        <div className="ml-8 hidden gap-0.5 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isCurrentPage(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 whitespace-nowrap rounded-[7px] border-b-2 px-3.5 py-1.5 text-[14px] no-underline transition-all"
                style={{
                  fontWeight: active ? 600 : 500,
                  color: active ? "#0a0a0a" : "#555",
                  borderBottomColor: active ? "#1a7f4b" : "transparent",
                }}
              >
                {link.label}
                {link.dropdown ? <span className="text-[9px] opacity-40">▾</span> : null}
              </a>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            aria-label="Search"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] bg-[#f5f5f5] text-[#888]"
          >
            ⌕
          </button>
          <button className="hidden h-[34px] items-center rounded-[8px] border border-[#e8e8e8] bg-white px-4 text-[13px] font-[500] text-[#2d2d2d] md:flex">
            Sign in
          </button>
          <button className="flex h-[34px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] border-0 bg-[#0a0a0a] px-4 text-[13px] font-[600] text-white">
            <span className="hidden md:inline">Start Free Trial</span>
            <span className="md:hidden">Get started</span>
            <span className="text-[12px]">↗</span>
          </button>
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
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block border-b border-[#f5f5f5] py-3.5 text-[17px] font-[500] text-[#2d2d2d] no-underline"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-5 flex flex-col gap-2.5">
            <button className="h-12 rounded-[10px] border-0 bg-[#0a0a0a] text-[16px] font-[600] text-white">Start Free Trial ↗</button>
            <button className="h-12 rounded-[10px] border border-[#e8e8e8] bg-white text-[16px] font-[500] text-[#2d2d2d]">Sign in</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
