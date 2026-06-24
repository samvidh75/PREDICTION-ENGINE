import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Logo from "../brand/Logo";
import { MiniSparkline } from "../ui/ScoreRing";
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

  return (
    <nav className="h-[44px] bg-[#000000] flex items-center px-5 sticky top-0 z-50">
      <div className="max-w-[1280px] w-full mx-auto flex items-center">
        <button onClick={() => productNavigate("landing")}>
          <Logo />
        </button>
        <div className="hidden md:flex items-center gap-[24px] ml-auto mr-auto">
          {Object.entries(navRoutes).map(([label, route]) => (
            <button
              key={label}
              onClick={() => productNavigate(route)}
              className="text-[12px] font-[400] text-white/80 hover:text-white tracking-[-0.12px] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            className="w-[28px] h-[28px] flex items-center justify-center text-white/60 hover:text-white transition-colors"
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
                className="bg-[#1d1d1f] text-white text-[12px] font-[400] tracking-[-0.12px] px-[14px] py-[6px] rounded-[8px] hover:bg-[#333] transition-colors"
                onClick={() => productNavigate("login")}
              >
                Sign in
              </button>
              <button
                className="bg-[#0066cc] text-white text-[12px] font-[400] tracking-[-0.12px] px-[14px] py-[6px] rounded-[9999px] hover:opacity-90 transition-opacity active:scale-[0.95]"
                onClick={() => productNavigate("signup")}
              >
                Start Free Trial
              </button>
            </>
          )}
        </div>
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
              ? { price: result.value.price ?? null, change: result.value.changePercent ?? null }
              : { price: null, change: null };
        });
        setQuotes(next);
      },
    );
    return () => { active = false; };
  }, []);

  return (
    <div className="h-[40px] bg-white border-b border-[#f0f0f0] flex items-center px-5">
      <div className="max-w-[1280px] w-full mx-auto flex items-center gap-6">
        {indices.map((index) => {
          const quote = quotes[index.symbol];
          const change = quote?.change ?? null;
          const price = quote?.price ?? null;
          const isPositive = change !== null && change >= 0;
          return (
            <div key={index.name} className="flex items-center gap-2">
              <span className="text-[10px] font-[600] text-[#7a7a7a] tracking-[0.03em]">{index.name}</span>
              <span className="text-[12px] font-[600] text-[#1d1d1f] tabular">
                {price !== null ? price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </span>
              {change !== null && (
                <span className={`text-[11px] font-[500] ${isPositive ? 'text-[#1a7f4b]' : 'text-[#c0392b]'}`}>
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-[5px] h-[5px] rounded-full ${open ? 'bg-[#22c55e]' : 'bg-[#ccc]'}`} />
          <span className={`text-[10px] font-[500] ${open ? 'text-[#1a7f4b]' : 'text-[#7a7a7a]'}`}>
            {open ? 'Open' : 'Closed'}
          </span>
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
    <div className="bg-[#f5f5f7] min-h-screen">
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
