import { useEffect, useState } from "react";
import { Crown, Search, Settings } from "lucide-react";
import Logo from "../brand/Logo";
import { productNavigate } from "../product/ProductUI";
import { api } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import ProfileButton from "../navigation/ProfileButton";
import { CommandPalette } from "../intelligence/CommandPalette";
import { trackPageView } from "../../lib/analytics";
import { getPreferences, setPreferences, type UserPreferences } from "../../lib/preferences";
import { isPremium } from "../../lib/subscription";
import { PricingModal } from "../premium/PremiumGate";
import ProductTopBar from "../product/ProductTopBar";
import MobileBottomNav from "../product/MobileBottomNav";

const indices = [
  { name: "NIFTY 50", symbol: "^NSEI" },
  { name: "SENSEX", symbol: "^BSESN" },
  { name: "BANK NIFTY", symbol: "^NSEBANK" },
  { name: "NIFTY IT", symbol: "^CNXIT" },
] as const;
interface IndexState { price: number | null; change: number | null }
const navRoutes: Record<string, string> = {
  Research: "landing", Scanner: "scanner", Compare: "compare",
  Watchlist: "watchlist", Pricing: "pricing", Learn: "methodology",
};

function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.getDay() >= 1 && ist.getDay() <= 5 &&
    ((ist.getHours() > 9 || (ist.getHours() === 9 && ist.getMinutes() >= 15)) &&
     (ist.getHours() < 15 || (ist.getHours() === 15 && ist.getMinutes() <= 30)));
}

/** @deprecated Use ProductTopBar instead. Kept for backward compat via navigation/TopNav.tsx re-export. */
export function TopNav({ active = "" }: { active?: string }) {
  const { isAuthenticated, user } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);
  const premium = isPremium();
  return (
    <nav style={{ background: '#0D1117', borderBottom: '1px solid rgba(148,163,184,0.16)' }}
      className="h-[64px] flex items-center px-6 sticky top-0 z-50">
      <div className="max-w-[1200px] w-full mx-auto flex items-center">
        <button onClick={() => productNavigate("landing")}><Logo /></button>
        <div className="hidden md:flex items-center gap-[20px] ml-10">
          {Object.entries(navRoutes).map(([label, route]) => (
            <button key={label} onClick={() => productNavigate(route)}
              className="text-[14px] font-[400] text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-[-0.2px] transition-colors">
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setPricingOpen(true)}
            className={`text-[12px] font-[400] rounded-[9999px] px-[12px] py-[6px] transition-all active:scale-[0.97] flex items-center gap-1.5 ${
              premium
                ? 'bg-[rgba(41,98,255,0.1)] text-[#2962FF] border border-[#2962FF]'
                : 'bg-[rgba(41,98,255,0.1)] text-[#2962FF] hover:bg-[rgba(41,98,255,0.2)]'
            }`}>
            <Crown size={12} /> {premium ? 'Premium' : 'Upgrade'}
          </button>
          <button onClick={() => productNavigate("search")} aria-label="Search"
            className="w-[34px] h-[34px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Search size={15} />
          </button>
          {isAuthenticated && user ? <ProfileButton /> : (
            <>
              <button onClick={() => productNavigate("login")}
                className="text-[14px] font-[400] text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-[-0.2px] transition-colors px-3 py-1.5">
                Sign in
              </button>
              <button onClick={() => productNavigate("signup")}
                className="bg-[#2962FF] text-white text-[14px] font-[400] rounded-[9999px] px-[16px] py-[8px] hover:bg-[#2554d4] transition-colors active:scale-[0.97]">
                Start Free Trial
              </button>
            </>
          )}
        </div>
      </div>
      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
    </nav>
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
      indices.forEach((idx, pos) => {
        const r = settled[pos];
        next[idx.symbol] = r.status === "fulfilled" && r.value != null
          ? { price: r.value.price ?? null, change: r.value.changePercent ?? null }
          : { price: null, change: null };
      });
      setQuotes(next);
    });
    return () => { active = false; };
  }, []);

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(148,163,184,0.16)' }}
      className="h-[40px] flex items-center px-6">
      <div className="max-w-[1200px] w-full mx-auto flex items-center gap-5">
        {indices.map(idx => {
          const q = quotes[idx.symbol];
          const ch = q?.change ?? null;
          const pr = q?.price ?? null;
          return (
            <div key={idx.name} className="flex items-center gap-2">
              <span className="text-[11px] font-[400] text-[var(--text-muted)] tracking-[-0.2px]">{idx.name}</span>
              <span className="text-[12px] font-[400] text-[var(--text-primary)] tabular">
                {pr !== null ? pr.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
              </span>
              {ch !== null && (
                <span className={`text-[11px] font-[400] ${ch >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {ch >= 0 ? '+' : ''}{ch.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-[5px] h-[5px] rounded-full ${open ? 'bg-[var(--positive)]' : 'bg-[var(--text-muted)]'}`} />
          <span className={`text-[10px] font-[400] ${open ? 'text-[var(--positive)]' : 'text-[var(--text-muted)]'}`}>
            {open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefsState] = useState<UserPreferences>(getPreferences);

  // Track page view on mount and page change
  useEffect(() => {
    const page = new URLSearchParams(window.location.search).get("page") || "home";
    const id = new URLSearchParams(window.location.search).get("id");
    trackPageView(page, id ?? undefined);
  }, []);

  useEffect(() => {
    const handler = () => {
      const page = new URLSearchParams(window.location.search).get("page") || "home";
      const id = new URLSearchParams(window.location.search).get("id");
      trackPageView(page, id ?? undefined);
    };
    window.addEventListener("urlchange", handler);
    return () => window.removeEventListener("urlchange", handler);
  }, []);

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const updatePrefs = (update: Partial<UserPreferences>) => {
    const updated = setPreferences(update);
    setPrefsState(updated);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <a href="#ss-main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-[var(--surface)] focus:z-[100]">Skip to main content</a>
      <ProductTopBar compact={isMobile} />
      <main id="ss-main-content" className="relative">{children}</main>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Settings toggle */}
      <button onClick={() => setPrefsOpen(!prefsOpen)}
        className="fixed bottom-4 right-4 w-[36px] h-[36px] rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.3)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] z-40 active:scale-[0.95]">
        <Settings size={15} />
      </button>

      {/* Preferences panel */}
      {prefsOpen && (
        <div className="fixed bottom-14 right-4 w-[260px] bg-[var(--elevated)] rounded-[12px] border border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)] p-4 z-40">
          <div className="text-[12px] font-[400] text-[var(--text-primary)] mb-3 tracking-[-0.2px]">Preferences</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-secondary)]">Compact Mode</span>
              <button onClick={() => updatePrefs({ compactMode: !prefs.compactMode })}
                className={`w-[36px] h-[20px] rounded-full transition-colors ${prefs.compactMode ? 'bg-[#2962FF]' : 'bg-[var(--border)]'}`}>
                <div className={`w-[16px] h-[16px] rounded-full bg-white mt-[2px] transition-transform ${prefs.compactMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-secondary)]">Sparklines</span>
              <button onClick={() => updatePrefs({ showSparklines: !prefs.showSparklines })}
                className={`w-[36px] h-[20px] rounded-full transition-colors ${prefs.showSparklines ? 'bg-[#2962FF]' : 'bg-[var(--border)]'}`}>
                <div className={`w-[16px] h-[16px] rounded-full bg-white mt-[2px] transition-transform ${prefs.showSparklines ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">Font Size</span>
              <div className="flex gap-1">
                {(['sm','md','lg'] as const).map(s => (
                  <button key={s} onClick={() => updatePrefs({ fontSize: s })}
                    className={`flex-1 text-[10px] py-1.5 rounded-[6px] border transition-colors ${prefs.fontSize === s ? 'bg-[#2962FF] text-white border-[#2962FF]' : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)]'}`}>
                    {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">Rows per page</span>
              <select value={prefs.defaultPageSize} onChange={e => updatePrefs({ defaultPageSize: Number(e.target.value) })}
                className="w-full text-[11px] text-[var(--text-primary)] border border-[var(--border)] rounded-[6px] px-2 py-1.5 bg-[var(--surface)]">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            {prefs.recentlyViewed.length > 0 && (
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block mb-1">Recently Viewed</span>
                <div className="flex flex-wrap gap-1">
                  {prefs.recentlyViewed.map(s => (
                    <button key={s} onClick={() => productNavigate("stock", s)}
                      className="text-[9px] text-[#2962FF] bg-[rgba(41,98,255,0.1)] px-2 py-0.5 rounded-[4px]">{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isMobile && <MobileBottomNav />}
    </div>
  );
}
