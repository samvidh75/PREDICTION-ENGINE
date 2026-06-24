import { useEffect, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import Logo from "../brand/Logo";
import { MiniSparkline } from "../../premium/PremiumComponents";
import { productNavigate } from "../product/ProductUI";
import { api } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import ProfileButton from "../navigation/ProfileButton";
import { CommandPalette } from "../intelligence/CommandPalette";

const indices = [
  { name: "NIFTY 50", symbol: "^NSEI" },
  { name: "SENSEX", symbol: "^BSESN" },
  { name: "BANK NIFTY", symbol: "^NSEBANK" },
  { name: "NIFTY IT", symbol: "^CNXIT" },
] as const;

interface IndexState {
  price: number | null;
  change: number | null;
  history?: number[];
}

const navRoutes: Record<string, string> = {
  Research: "landing",
  Scanner: "scanner",
  Compare: "compare",
  Watchlist: "watchlist",
  Pricing: "pricing",
  Learn: "methodology",
};

function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = ist.getHours(), m = ist.getMinutes();
  const day = ist.getDay();
  const isWeekday = day >= 1 && day <= 5;
  const afterOpen = h > 9 || (h === 9 && m >= 15);
  const beforeClose = h < 15 || (h === 15 && m <= 30);
  return isWeekday && afterOpen && beforeClose;
}

export function TopNav({ active = "" }: { active?: string }) {
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="h-[56px] bg-white border-b border-[#e8e8e8] flex items-center px-7 gap-0 sticky top-0 z-50">
      <button onClick={() => productNavigate("landing")} className="flex-shrink-0">
        <Logo />
      </button>
      <div className="hidden md:flex items-center gap-1 ml-8">
        {Object.entries(navRoutes).map(([label, route]) => (
          <button
            key={label}
            onClick={() => productNavigate(route)}
            className={`text-[14px] font-[500] px-3 py-1.5 rounded-md transition-colors relative ${
              active === label.toLowerCase()
                ? "text-[#0a0a0a] font-[600]"
                : "text-[#555] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
            }`}
          >
            {label}
            {(label === "Research" || label === "Learn") && (
              <span className="ml-0.5 text-[10px]">▾</span>
            )}
            {active === "scanner" && label === "Scanner" && (
              <span className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 w-[60%] h-[2px] bg-[#1a7f4b] rounded-full" />
            )}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] border border-[#e8e8e8] text-[#888] hover:text-[#0a0a0a] transition-colors"
          onClick={() => productNavigate("search")}
          aria-label="Search"
        >
          <Search size={14} />
        </button>
        {isAuthenticated && user ? (
          <ProfileButton />
        ) : (
          <>
            <button
              className="h-[34px] px-4 text-[13px] font-[500] text-[#2d2d2d] bg-white border border-[#e8e8e8] rounded-[8px] hover:border-[#ccc] transition-colors"
              onClick={() => productNavigate("login")}
            >
              Sign in
            </button>
            <button
              className="h-[34px] px-4 text-[13px] font-[600] text-white bg-[#0a0a0a] rounded-[8px] flex items-center gap-2 hover:bg-[#222] transition-colors"
              onClick={() => productNavigate("signup")}
            >
              Start Free Trial
              <ArrowUpRight size={14} />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export function MarketTicker() {
  const open = isMarketOpen();
  const [quotes, setQuotes] = useState<Record<string, IndexState>>({});

  useEffect(() => {
    let active = true;
    Promise.allSettled(indices.map((index) => api.price.getQuote(index.symbol))).then(
      (settled) => {
        if (!active) return;
        const next: Record<string, IndexState> = {};
        indices.forEach((index, position) => {
          const result = settled[position];
          next[index.symbol] =
            result.status === "fulfilled" && result.value != null
              ? {
                  price: result.value.price ?? null,
                  change: result.value.changePercent ?? null,
                }
              : { price: null, change: null };
        });
        setQuotes(next);
      },
    );
    return () => { active = false; };
  }, []);

  return (
    <div className="h-[48px] bg-white border-b border-[#e8e8e8] flex">
      {indices.map((index) => {
        const quote = quotes[index.symbol];
        const change = quote?.change ?? null;
        const price = quote?.price ?? null;
        const isPositive = change !== null && change >= 0;
        return (
          <div key={index.name} className="flex-1 flex items-center gap-3 px-5 border-r border-[#e8e8e8] last:border-r-0">
            <div>
              <div className="text-[11px] font-[600] text-[#888] tracking-[0.04em]">{index.name}</div>
              <div className="text-[14px] font-[700] text-[#0a0a0a] tabular">
                {price !== null
                  ? price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "—"}
              </div>
            </div>
            {change !== null && (
              <span className={`text-[12px] font-[600] ${isPositive ? 'text-[#1a7f4b]' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </span>
            )}
            <MiniSparkline data={[]} color="#1a7f4b" width={60} height={24} />
          </div>
        );
      })}
      <div className="flex items-center gap-2 px-5 border-l border-[#e8e8e8] flex-shrink-0">
        <div className={`w-[7px] h-[7px] rounded-full ${open ? 'bg-[#22c55e]' : 'bg-[#ccc]'}`} />
        <div>
          <div className={`text-[12px] font-[600] ${open ? 'text-[#1a7f4b]' : 'text-[#888]'}`}>
            {open ? 'Market is Open' : 'Market Closed'}
          </div>
          <div className="text-[11px] text-[#888]">
            {open ? 'Closes 3:30 PM ▾' : 'Opens 9:15 AM ▾'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: string;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <div className="bg-[#f7f7f5] min-h-screen">
      <a href="#ss-main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white focus:z-[100]">
        Skip to main content
      </a>
      <TopNav active={active} />
      <MarketTicker />
      <main id="ss-main-content">{children}</main>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
