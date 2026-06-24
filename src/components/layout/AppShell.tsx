import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Logo from "../brand/Logo";
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

interface IndexState { price: number | null; change: number | null }

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
  return day >= 1 && day <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));
}

export function TopNav({ active = "" }: { active?: string }) {
  const { isAuthenticated, user } = useAuth();
  return (
    <nav className="h-[44px] bg-[#000000] flex items-center px-5 sticky top-0 z-50">
      <div className="max-w-[1280px] w-full mx-auto flex items-center">
        <button onClick={() => productNavigate("landing")}><Logo /></button>
        <div className="hidden md:flex items-center gap-[20px] ml-auto mr-auto">
          {Object.entries(navRoutes).map(([label, route]) => (
            <button key={label} onClick={() => productNavigate(route)}
              className="text-[12px] font-[400] text-white/80 hover:text-white tracking-[-0.12px] transition-colors">
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[10px]">
          <button className="w-[28px] h-[28px] flex items-center justify-center text-white/60 hover:text-white transition-colors"
            onClick={() => productNavigate("search")} aria-label="Search">
            <Search size={14} />
          </button>
          {isAuthenticated && user ? (
            <ProfileButton />
          ) : (
            <>
              <button onClick={() => productNavigate("login")}
                className="bg-[#1d1d1f] text-white text-[12px] font-[400] tracking-[-0.12px] px-[15px] py-[8px] rounded-[8px] hover:bg-[#333] transition-colors active:scale-[0.95]">
                Sign in
              </button>
              <button onClick={() => productNavigate("signup")}
                className="bg-[#0066cc] text-white text-[12px] font-[400] tracking-[-0.12px] px-[15px] py-[8px] rounded-[9999px] hover:opacity-90 transition-opacity active:scale-[0.95]">
                Start Free Trial
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export function SubNav({ title, active }: { title: string; active?: string }) {
  return (
    <div className="h-[52px] bg-[rgba(245,245,247,0.8)] backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-[rgba(0,0,0,0.08)] flex items-center px-5 sticky top-[44px] z-40">
      <div className="max-w-[1280px] w-full mx-auto flex items-center">
        <span className="text-[21px] font-[600] text-[#1d1d1f] leading-[1.19] tracking-[0.231px]">{title}</span>
        <div className="ml-auto flex items-center gap-[16px]">
          <span className="text-[14px] font-[400] text-[#7a7a7a] tracking-[-0.224px]">Overview</span>
          <span className="text-[14px] font-[400] text-[#7a7a7a] tracking-[-0.224px]">Features</span>
          <span className="text-[14px] font-[400] text-[#7a7a7a] tracking-[-0.224px]">Compare</span>
          <button className="bg-[#0066cc] text-white text-[14px] font-[400] tracking-[-0.224px] px-[15px] py-[8px] rounded-[9999px] hover:opacity-90 transition-opacity active:scale-[0.95]">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarketTicker() {
  const open = isMarketOpen();
  const [quotes, setQuotes] = useState<Record<string, IndexState>>({});
  useEffect(() => {
    let active = true;
    Promise.allSettled(indices.map(i => api.price.getQuote(i.symbol))).then(settled => {
      if (!active) return;
      const next: Record<string, IndexState> = {};
      indices.forEach((index, pos) => {
        const r = settled[pos];
        next[index.symbol] = r.status === "fulfilled" && r.value != null
          ? { price: r.value.price ?? null, change: r.value.changePercent ?? null }
          : { price: null, change: null };
      });
      setQuotes(next);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="h-[36px] bg-white border-b border-[#e0e0e0] flex items-center px-5">
      <div className="max-w-[1280px] w-full mx-auto flex items-center gap-5">
        {indices.map(index => {
          const q = quotes[index.symbol];
          const ch = q?.change ?? null;
          const pr = q?.price ?? null;
          return (
            <div key={index.name} className="flex items-center gap-1.5">
              <span className="text-[10px] font-[600] text-[#7a7a7a] tracking-[0.03em]">{index.name}</span>
              <span className="text-[11px] font-[600] text-[#1d1d1f] tabular">
                {pr !== null ? pr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </span>
              {ch !== null && (
                <span className={`text-[10px] font-[500] ${ch >= 0 ? 'text-[#1a7f4b]' : 'text-[#c0392b]'}`}>
                  {ch >= 0 ? '+' : ''}{ch.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-[5px] h-[5px] rounded-full ${open ? 'bg-[#22c55e]' : 'bg-[#ccc]'}`} />
          <span className={`text-[10px] font-[500] ${open ? 'text-[#1a7f4b]' : 'text-[#7a7a7a]'}`}>{open ? 'Open' : 'Closed'}</span>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(o => !o);
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <div className="bg-[#f5f5f7] min-h-screen">
      <a href="#ss-main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white focus:z-[100]">Skip to main content</a>
      <TopNav active={active} />
      <SubNav title="Research" active={active} />
      <MarketTicker />
      <main id="ss-main-content">{children}</main>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
