import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* Curated, well-known PSE names — a starting shortlist, not the full
   universe (see /scanner for that). Prices come from /api/market-universe,
   the real live snapshot across the full ~294-ticker PSE common-share list. */
const WATCH_LIST = [
  { symbol: "SM", name: "SM Investments" },
  { symbol: "BDO", name: "BDO Unibank" },
  { symbol: "AC", name: "Ayala Corp" },
  { symbol: "ALI", name: "Ayala Land" },
  { symbol: "JFC", name: "Jollibee Foods" },
  { symbol: "ICT", name: "ICTSI" },
  { symbol: "TEL", name: "PLDT" },
  { symbol: "GLO", name: "Globe Telecom" },
  { symbol: "BPI", name: "Bank of the Philippine Islands" },
  { symbol: "URC", name: "Universal Robina" },
];

interface UniverseQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

export function WatchStrip() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Record<string, UniverseQuote>>({});

  useEffect(() => {
    fetch("/api/market-universe")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.ok && Array.isArray(payload.quotes)) {
          const map: Record<string, UniverseQuote> = {};
          for (const q of payload.quotes as UniverseQuote[]) map[q.symbol] = q;
          setQuotes(map);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section aria-label="Watchlist shortcuts" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(20px, 2vw, 24px)",
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Well-known PSE names
        </h2>
        <button
          onClick={() => navigate("/scanner")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12.5, fontWeight: 500, color: "var(--accent)",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          See the full screener →
        </button>
      </div>

      {/* .stockex-stagger — CSS-driven entrance, immune to rAF throttling in a
          backgrounded tab (unlike Framer Motion's initial/animate, which is
          stepped by requestAnimationFrame and can freeze at opacity:0). */}
      <div className="stockex-stagger flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        {WATCH_LIST.map((s) => {
          const q = quotes[s.symbol];
          const up = (q?.changePercent ?? 0) >= 0;
          return (
            <motion.button
              key={s.symbol}
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/stock/${s.symbol}`)}
              className="shrink-0 rounded-full flex items-center gap-2.5"
              style={{
                padding: "9px 16px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
                WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "border-color 200ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--glass-border-top)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                {s.symbol}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-body)" }}>{s.name}</span>
              {q && (
                <>
                  <span style={{ width: 1, height: 12, background: "var(--glass-border-top)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>
                    ₱{q.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700, color: up ? "var(--market-green)" : "var(--market-red)" }}>
                    {up ? "+" : ""}{q.changePercent.toFixed(2)}%
                  </span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
