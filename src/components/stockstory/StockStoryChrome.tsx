import { ArrowUpRight, ChevronDown, Search } from "lucide-react";

const navigate = (page: string, id?: string) => {
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.search = "";
  if (page !== "home") url.searchParams.set("page", page);
  if (id) url.searchParams.set("id", id);
  window.history.pushState({}, "", url);
  window.dispatchEvent(new Event("urlchange"));
};

export function Brand() {
  return (
    <button type="button" onClick={() => navigate("home")} className="flex items-center gap-2 text-left" aria-label="StockStory India home">
      <span className="grid h-8 w-8 -rotate-6 place-items-center rounded-lg bg-[#111] text-lg font-black text-white">S</span>
      <span className="leading-none"><span className="block text-[17px] font-extrabold">StockStory</span><span className="mt-0.5 block text-[9px] font-semibold text-[#777]">India</span></span>
    </button>
  );
}

export function TopNav({ active = "" }: { active?: string }) {
  const items = ["Research", "Scanner", "Compare", "Watchlist", "Pricing", "Learn"];
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[#e8e8e5] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between px-6">
        <Brand />
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
          {items.map((item) => (
            <button key={item} type="button" onClick={() => navigate(item.toLowerCase())} className={`flex h-14 items-center gap-1 border-b-2 px-0.5 text-[13px] font-medium ${active === item.toLowerCase() ? "border-[#168345] text-[#111]" : "border-transparent text-[#282828] hover:text-[#168345]"}`}>
              {item}{(item === "Research" || item === "Learn") && <ChevronDown className="h-3 w-3" />}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Search" onClick={() => navigate("search")} className="hidden rounded-lg p-2 hover:bg-[#f4f4f1] sm:block"><Search className="h-4 w-4" /></button>
          <button type="button" onClick={() => navigate("login")} className="text-[13px] font-medium">Sign in</button>
          <button type="button" onClick={() => navigate("signup")} className="flex h-10 items-center gap-2 rounded-lg bg-[#151515] px-4 text-[12px] font-semibold text-white shadow-sm hover:bg-black">Start Free Trial <ArrowUpRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </header>
  );
}

const indices = [
  ["NIFTY 50", "22,502.35", "+1.15%"],
  ["SENSEX", "74,115.17", "+1.10%"],
  ["BANK NIFTY", "48,753.30", "+1.35%"],
  ["NIFTY IT", "35,392.20", "+1.80%"],
] as const;

function MiniLine({ offset = 0 }: { offset?: number }) {
  const points = [20,18,21,16,19,14,16,11,13,8,10,5,7,2].map((y, index) => `${index * 4.5},${Math.max(1, y - offset)}`).join(" ");
  return <svg viewBox="0 0 60 24" className="h-6 w-[60px]" aria-hidden="true"><polyline fill="none" stroke="#168345" strokeWidth="1.4" points={points} /></svg>;
}

export function MarketTicker() {
  return (
    <div className="border-b border-[#e8e8e5] bg-white">
      <div className="mx-auto grid h-[66px] max-w-[1380px] grid-cols-2 items-center px-6 md:grid-cols-5">
        {indices.map(([name, value, change], index) => (
          <div key={name} className={`flex items-center justify-between px-4 ${index > 0 ? "border-l border-[#ededeb]" : ""}`}>
            <div><div className="text-[9px] font-bold text-[#444]">{name}</div><div className="tabular mt-1 text-[14px] font-bold">{value} <span className="ml-2 text-[10px] font-semibold text-[#168345]">{change}</span></div></div>
            <MiniLine offset={index % 2} />
          </div>
        ))}
        <div className="hidden items-center justify-center gap-2 border-l border-[#ededeb] md:flex"><span className="h-2 w-2 rounded-full bg-[#18a252]"/><div><div className="text-[11px] font-semibold text-[#168345]">Market is Open</div><div className="text-[9px] text-[#999]">Closes 3:30 PM</div></div><ChevronDown className="h-3 w-3 text-[#777]" /></div>
      </div>
    </div>
  );
}

export { navigate, MiniLine };
