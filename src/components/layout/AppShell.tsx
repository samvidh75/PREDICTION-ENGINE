import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import Logo from "../brand/Logo";
import { MiniSparkline } from "../ui/ResearchUI";
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
const navRoutes = {
  Research: "landing",
  Scanner: "scanner",
  Compare: "compare",
  Watchlist: "watchlist",
  Pricing: "pricing",
  Learn: "methodology",
} as const;
export function TopNav({ active = "" }: { active?: string }) {
  const { isAuthenticated, user } = useAuth();
  return (
    <header className="topnav">
      <button
        className="logo-button"
        onClick={() => productNavigate("landing")}
        aria-label="StockStory home"
      >
        <Logo />
      </button>
      <nav aria-label="Primary navigation">
        {Object.entries(navRoutes).map(([label, route]) => (
          <button
            className={active === label.toLowerCase() ? "active" : ""}
            key={label}
            onClick={() => productNavigate(route)}
          >
            {label}
            {(label === "Research" || label === "Learn") && <small>⌄</small>}
          </button>
        ))}
      </nav>
      <div className="nav-actions">
        <button
          className="icon-btn"
          aria-label="Search companies"
          onClick={() => productNavigate("search")}
        >
          <Search size={16} />
        </button>
        {isAuthenticated && user ? (
          <ProfileButton />
        ) : (
          <>
            <button className="sign" onClick={() => productNavigate("login")}>
              Sign in
            </button>
            <button
              className="primary"
              onClick={() => productNavigate("signup")}
            >
              Start Free Trial ↗
            </button>
          </>
        )}
        <button
          className="hamb"
          onClick={() => productNavigate("more")}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}
function marketOpen() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const day = parts.find((x) => x.type === "weekday")?.value ?? "";
  const h = Number(parts.find((x) => x.type === "hour")?.value ?? 0),
    m = Number(parts.find((x) => x.type === "minute")?.value ?? 0),
    t = h * 60 + m;
  return !["Sat", "Sun"].includes(day) && t >= 555 && t <= 930;
}
export function MarketTicker() {
  const open = marketOpen();
  const [quotes, setQuotes] = useState<Record<string, IndexState>>({});
  useEffect(() => {
    let active = true;
    if (typeof api.getQuote !== "function")
      return () => {
        active = false;
      };
    Promise.allSettled(indices.map((index) => api.getQuote(index.symbol))).then(
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
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="ticker">
      <div className="ticker-scroll">
        {indices.map((index) => {
          const quote = quotes[index.symbol];
          return (
            <div className="ticker-cell" key={index.name}>
              <div>
                <small>{index.name}</small>
                <strong className="num">
                  {quote?.price == null
                    ? "—"
                    : quote.price.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </strong>
              </div>
              <em
                className={
                  quote?.change != null && quote.change < 0 ? "negative" : ""
                }
              >
                {quote?.change == null
                  ? "—"
                  : `${quote.change > 0 ? "+" : ""}${quote.change.toFixed(2)}%`}
              </em>
              <MiniSparkline data={[]} />
            </div>
          );
        })}
        <div className="market-status">
          <div>
            <i className={open ? "pulse" : ""} />
            <b>{open ? "Market is Open" : "Market Closed"}</b>
          </div>
          <small>{open ? "Closes 3:30 PM" : "Opens 9:15 AM"}</small>
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
    <div className="app-shell">
      <a href="#ss-main-content" className="skip-link">
        Skip to main content
      </a>
      <TopNav active={active} />
      <MarketTicker />
      <main id="ss-main-content">{children}</main>
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </div>
  );
}
