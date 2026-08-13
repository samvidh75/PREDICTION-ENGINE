/**
 * PSE Trading Terminal — Professional Dashboard
 * High-density financial terminal for Philippine Stock Exchange traders
 * - Real-time PSEi ticker with market status
 * - Dense watchlist table with monospace alignment
 * - Sector heatmap and market overview
 * - Portfolio summary with live P&L
 */

import {
  Activity, Compass, Search, TrendingDown, TrendingUp, Eye,
  BarChart2, Bell, BookOpen, Zap, AlertCircle, ChevronRight, Clock,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMarketStatus } from "../hooks/useMarketStatus";

const COLORS = {
  canvas: "#0F1419",           // StockStory standard
  surface: "#151B27",          // StockStory standard
  primary: "#0891B2",          // Professional teal (StockStory)
  success: "#10B981",          // Gains
  danger: "#EF4444",           // Losses
  gold: "#E4A853",             // Premium signature (StockStory)
  text: "#F0F2F5",             // Off-white
  textMuted: "#9CA3AF",        // Muted gray
  border: "rgba(255, 255, 255, 0.08)",
};

function liveClock(): string {
  return new Date().toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const PSEI_BENCHMARK = {
  value: 6542.25,
  change: 45.50,
  changePercent: 0.70,
};

const WATCHLIST = [
  { symbol: "SM", name: "SM Investments", price: 875.50, change: 12.50, changePercent: 1.45, change7d: 3.2, volume: "2.5M" },
  { symbol: "BDO", name: "BDO Unibank", price: 132.40, change: -2.10, changePercent: -1.56, change7d: -2.1, volume: "18.2M" },
  { symbol: "JFC", name: "Jollibee Foods", price: 234.80, change: 8.20, changePercent: 3.61, change7d: 5.8, volume: "1.1M" },
  { symbol: "ALI", name: "Ayala Land", price: 32.90, change: 0.80, changePercent: 2.49, change7d: 1.5, volume: "45.3M" },
  { symbol: "SMPH", name: "SM Prime Holdings", price: 36.85, change: -1.15, changePercent: -3.02, change7d: -0.8, volume: "12.7M" },
  { symbol: "BPI", name: "Bank of the Philippine Islands", price: 89.20, change: 3.40, changePercent: 3.97, change7d: 2.3, volume: "8.9M" },
  { symbol: "MEG", name: "Megaworld Corporation", price: 2.28, change: 0.05, changePercent: 2.24, change7d: 1.1, volume: "156.5M" },
  { symbol: "AEV", name: "Aboitiz Equity Ventures", price: 55.45, change: 1.20, changePercent: 2.21, change7d: 3.4, volume: "3.2M" },
];

const SECTORS = [
  { name: "Banks", change: 1.2, color: "#10B981" },
  { name: "Retail", change: 2.8, color: "#10B981" },
  { name: "Manufacturing", change: -0.5, color: "#EF4444" },
  { name: "Utilities", change: 0.8, color: "#10B981" },
  { name: "Energy", change: -1.2, color: "#EF4444" },
  { name: "Healthcare", change: 3.1, color: "#10B981" },
];

const TOP_HOLDINGS = [
  { symbol: "SM", shares: 150, value: 131325, change: 2.3 },
  { symbol: "BDO", shares: 200, value: 26480, change: -1.2 },
  { symbol: "JFC", shares: 50, value: 11740, change: 3.6 },
];

const QUICK_LINKS = [
  { icon: TrendingUp, label: "Gainers", route: "/scanner?mode=gainers", color: COLORS.success },
  { icon: TrendingDown, label: "Losers", route: "/scanner?mode=losers", color: COLORS.danger },
  { icon: Activity, label: "Active", route: "/scanner?mode=active", color: COLORS.primary },
  { icon: BarChart2, label: "Sectors", route: "/sectors", color: COLORS.primary },
  { icon: Bell, label: "Alerts", route: "/alerts", color: COLORS.danger },
];

function MarketStatusBar({ marketStatus, clock }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        borderBottom: `1px solid ${COLORS.border}`,
        height: "32px",
        backgroundColor: COLORS.canvas,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.text, fontFamily: '"JetBrains Mono", monospace' }}>
            PSEi
          </span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.text, fontFamily: '"JetBrains Mono", monospace' }}>
            {PSEI_BENCHMARK.value.toFixed(2)}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: PSEI_BENCHMARK.changePercent >= 0 ? COLORS.success : COLORS.danger,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {PSEI_BENCHMARK.changePercent >= 0 ? "+" : ""}{PSEI_BENCHMARK.changePercent.toFixed(2)}%
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingLeft: "8px", borderLeft: `1px solid ${COLORS.border}` }}>
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: marketStatus.isOpen ? COLORS.success : COLORS.textMuted,
            }}
          />
          <span style={{ fontSize: "10px", color: COLORS.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
            {marketStatus.label}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: COLORS.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
        <Clock size={12} />
        {clock}
      </div>
    </div>
  );
}

function SearchBar({ searchRef, query, setQuery, navigate }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
        <Search
          size={12}
          style={{
            position: "absolute",
            left: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            color: COLORS.textMuted,
            pointerEvents: "none",
          }}
        />
        <input
          ref={searchRef}
          placeholder="Search tickers (Cmd+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          style={{
            width: "100%",
            height: "36px",
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.surface,
            borderRadius: "3px",
            padding: "0 32px",
            fontSize: "11px",
            color: COLORS.text,
            fontFamily: '"JetBrains Mono", monospace',
            outline: "none",
            transition: "border-color 120ms ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.primary; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
        />
      </div>

      <div style={{ display: "flex", gap: "3px" }}>
        {QUICK_LINKS.map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.route)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              padding: "6px 8px",
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 500,
              color: COLORS.text,
              transition: "all 120ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = link.color;
              (e.currentTarget as HTMLElement).style.backgroundColor = `${link.color}10`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = COLORS.border;
              (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.surface;
            }}
          >
            <link.icon size={9} style={{ color: link.color }} />
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WatchlistTable({ handleNavigateStock }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, overflow: "hidden", flex: 1 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr 70px 70px 60px 60px",
          gap: "8px",
          padding: "6px 10px",
          borderBottom: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.canvas,
          fontSize: "9px",
          fontWeight: 700,
          color: COLORS.primary,
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        <div>Symbol</div>
        <div>Company</div>
        <div style={{ textAlign: "right" }}>Price</div>
        <div style={{ textAlign: "right" }}>1D %</div>
        <div style={{ textAlign: "right" }}>7D %</div>
        <div style={{ textAlign: "right" }}>Volume</div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {WATCHLIST.map((stock, idx) => (
          <div
            key={stock.symbol}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 70px 70px 60px 60px",
              gap: "8px",
              padding: "6px 10px",
              borderBottom: `1px solid ${COLORS.border}`,
              alignItems: "center",
              fontSize: "11px",
              fontFamily: '"JetBrains Mono", monospace',
              cursor: "pointer",
              transition: "background-color 100ms ease",
              height: "32px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = `rgba(8, 145, 178, 0.08)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
            onClick={() => handleNavigateStock(stock.symbol)}
          >
            <div style={{ fontWeight: 700, color: COLORS.primary, letterSpacing: "0.5px" }}>{stock.symbol}</div>
            <div style={{ color: COLORS.textMuted, fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {stock.name}
            </div>
            <div style={{ textAlign: "right", color: COLORS.text, fontWeight: 500 }}>
              {stock.price.toFixed(2)}
            </div>
            <div
              style={{
                textAlign: "right",
                color: stock.changePercent >= 0 ? COLORS.success : COLORS.danger,
                fontWeight: 600,
              }}
            >
              {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
            </div>
            <div
              style={{
                textAlign: "right",
                color: stock.change7d >= 0 ? COLORS.success : COLORS.danger,
                fontWeight: 500,
              }}
            >
              {stock.change7d >= 0 ? "+" : ""}{stock.change7d.toFixed(1)}%
            </div>
            <div style={{ textAlign: "right", color: COLORS.textMuted, fontSize: "10px" }}>{stock.volume}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectorHeatmap() {
  return (
    <div style={{ display: "flex", flexDirection: "column", backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: "10px", gap: "6px" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, color: COLORS.primary, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Sector Performance
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {SECTORS.map((sector) => (
          <div
            key={sector.name}
            style={{
              padding: "6px",
              backgroundColor: `${sector.color}15`,
              border: `1px solid ${sector.color}30`,
              borderRadius: "2px",
              fontSize: "9px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>{sector.name}</span>
            <span style={{ color: sector.color, fontWeight: 600 }}>
              {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioSummary() {
  const totalValue = TOP_HOLDINGS.reduce((sum, h) => sum + h.value, 0);
  const dayPL = 1245;
  const dayPLPercent = 0.51;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontSize: "9px", color: COLORS.textMuted, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Portfolio Value
        </div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: COLORS.text, fontFamily: '"JetBrains Mono", monospace' }}>
          {totalValue.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
        </div>
        <div style={{ display: "flex", gap: "8px", fontSize: "10px", fontFamily: '"JetBrains Mono", monospace', marginTop: "2px" }}>
          <span style={{ color: dayPL >= 0 ? COLORS.success : COLORS.danger, fontWeight: 600 }}>
            {dayPL >= 0 ? "+" : ""}{dayPL.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
          </span>
          <span style={{ color: dayPL >= 0 ? COLORS.success : COLORS.danger, fontWeight: 600 }}>
            {dayPLPercent >= 0 ? "+" : ""}{dayPLPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontSize: "9px", color: COLORS.primary, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Top Holdings
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {TOP_HOLDINGS.map((holding) => (
            <div key={holding.symbol} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: '"JetBrains Mono", monospace' }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ color: COLORS.primary, fontWeight: 600 }}>{holding.symbol}</span>
                <span style={{ color: COLORS.textMuted }}>{holding.shares} sh</span>
              </div>
              <span style={{ color: holding.change >= 0 ? COLORS.success : COLORS.danger, fontWeight: 500 }}>
                {holding.change >= 0 ? "+" : ""}{holding.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketBreadth() {
  return (
    <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, color: COLORS.primary, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Market Breadth
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", height: "4px", borderRadius: "2px", overflow: "hidden", backgroundColor: `${COLORS.border}` }}>
            <div style={{ width: "60%", backgroundColor: COLORS.success }}></div>
            <div style={{ width: "40%", backgroundColor: COLORS.danger }}></div>
          </div>
          <div style={{ display: "flex", gap: "6px", fontSize: "9px", marginTop: "3px", fontFamily: '"JetBrains Mono", monospace' }}>
            <span style={{ color: COLORS.success, fontWeight: 600 }}>60% Adv</span>
            <span style={{ color: COLORS.danger, fontWeight: 600 }}>40% Dec</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState(liveClock);
  const marketStatus = useMarketStatus();

  useEffect(() => {
    const t = window.setInterval(() => setClock(liveClock()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleNavigateStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: COLORS.canvas }}>
      <MarketStatusBar marketStatus={marketStatus} clock={clock} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: "8px 12px", gap: "8px" }}>
        <SearchBar searchRef={searchRef} query={query} setQuery={setQuery} navigate={navigate} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 200px", gap: "8px", flex: 1, minHeight: 0 }}>
          <WatchlistTable handleNavigateStock={handleNavigateStock} />

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflow: "auto" }}>
            <SectorHeatmap />
            <MarketBreadth />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflow: "auto" }}>
            <PortfolioSummary />
          </div>
        </div>

        <div
          style={{
            fontSize: "9px",
            color: COLORS.textMuted,
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            padding: "4px 0",
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: "6px",
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: "0.3px",
          }}
        >
          <span>PSEi · Market Hours 9:30 AM - 3:30 PM Manila</span>
          <span style={{ color: COLORS.textMuted }}>·</span>
          <Link
            to="/trust"
            style={{
              color: COLORS.primary,
              textDecoration: "none",
              transition: "color 120ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.success; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.primary; }}
          >
            Data sources
          </Link>
        </div>
      </div>
    </div>
  );
}
