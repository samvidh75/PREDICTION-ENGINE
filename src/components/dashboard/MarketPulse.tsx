import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { MarketStatusBadge } from "../MarketStatusBadge";
import { useMarketStatus } from "../../hooks/useMarketStatus";

interface PulseQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface PulseData {
  ok: boolean;
  asOf: string;
  coverage: string;
  indexChangePercent: number;
  breadth: { advancers: number; decliners: number; unchanged: number };
  gainers: PulseQuote[];
  losers: PulseQuote[];
  mostActive: PulseQuote[];
}

const glassCard: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  borderRadius: 8,
  transition: "border-color 150ms ease, background 150ms ease",
};

function glassHover(e: React.MouseEvent<HTMLElement>, entering: boolean) {
  const el = e.currentTarget;
  el.style.borderColor = entering ? "rgba(79,142,247,0.35)" : "var(--border)";
  el.style.background = entering ? "var(--bg-card-hover)" : "var(--bg-card)";
}

function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Springs from the previous value to the next instead of snapping. */
function AnimatedPercent({ value, loading }: { value: number; loading: boolean }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 120, damping: 20 });
  const rounded = useTransform(spring, (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`);
  const [display, setDisplay] = useState("+0.00%");

  useEffect(() => {
    if (loading) return;
    const controls = animate(motionVal, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, loading, motionVal]);

  useEffect(() => rounded.on("change", setDisplay), [rounded]);

  return <>{loading ? "···" : display}</>;
}

/** Breadth bar — a single glanceable strip showing advancers vs decliners
    vs unchanged, colored proportionally. Replaces the plain "X up · Y down"
    text with something that actually reads as data. */
function BreadthBar({ advancers, decliners, unchanged }: { advancers: number; decliners: number; unchanged: number }) {
  const total = Math.max(1, advancers + decliners + unchanged);
  const upPct = (advancers / total) * 100;
  const downPct = (decliners / total) * 100;
  return (
    <div style={{ position: "relative", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(245,239,230,0.06)" }}>
        <div style={{ width: `${upPct}%`, background: "var(--market-green)", transition: "width 600ms cubic-bezier(0.16,1,0.3,1)" }} />
        <div style={{ width: `${downPct}%`, background: "var(--market-red)", transition: "width 600ms cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)" }}>
        <span style={{ color: "var(--market-green)" }}>{advancers} advancing</span>
        <span>{unchanged} flat</span>
        <span style={{ color: "var(--market-red)" }}>{decliners} declining</span>
      </div>
    </div>
  );
}

function QuoteRow({ q, onClick }: { q: PulseQuote; onClick: () => void; index: number }) {
  const up = q.changePercent >= 0;
  const tint = up ? "var(--market-green)" : "var(--market-red)";
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-between"
      style={{
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left", minWidth: 0,
        padding: "10px 12px 10px 14px",
        borderLeft: `2px solid ${tint}40`,
        transition: "background 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,239,230,0.04)"; e.currentTarget.style.borderLeftColor = tint; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = `${tint}40`; }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, overflow: "hidden", marginRight: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)" }}>{q.symbol}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.name}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>{formatPeso(q.price)}</span>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700,
            color: tint,
            padding: "2px 7px", borderRadius: 999,
            background: `${tint}1F`,
            minWidth: 62, justifyContent: "center",
          }}
        >
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {q.changePercent.toFixed(2)}%
        </span>
      </span>
    </motion.button>
  );
}

export function MarketPulse() {
  const navigate = useNavigate();
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const firstLoad = useRef(true);
  const marketStatus = useMarketStatus();

  const load = () => {
    if (!firstLoad.current) setSpinning(true);
    fetch("/api/market-pulse")
      .then((r) => r.json())
      .then((payload: PulseData) => {
        if (payload.ok) { setData(payload); setError(false); }
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setSpinning(false); firstLoad.current = false; });
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const indexUp = (data?.indexChangePercent ?? 0) >= 0;
  const glowColor = indexUp ? "52,199,89" : "255,59,48";

  return (
    <section aria-label="Live PSE market pulse" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 3 }}>
          <span className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--accent)" }}>
            Market pulse
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <MarketStatusBadge size="sm" />
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "3px 10px 3px 8px", borderRadius: 999,
                border: `1px solid ${error ? "var(--border)" : "rgba(52,199,89,0.3)"}`,
                background: error ? "transparent" : "rgba(52,199,89,0.1)",
                fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em",
                color: error ? "var(--text-secondary)" : "var(--market-green)",
              }}
            >
              <motion.span
                className={error ? "" : "stockex-pulse-dot"}
                animate={error ? {} : { opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: error ? "var(--text-secondary)" : "var(--market-green)", display: "inline-block" }}
              />
              {error ? "Feed unavailable" : `${marketStatus.isOpen ? "Live" : "Last session"} · PSEi-30`}
            </span>
            {data && <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{data.coverage} reporting</span>}
          </div>
        </div>
        <button
          onClick={load}
          aria-label="Refresh"
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, transition: "border-color 180ms ease, color 180ms ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <RefreshCw size={12} style={{ transition: "transform 600ms ease", transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }} /> Refresh
        </button>
      </div>

      {error && !data && (
        <div style={{ ...glassCard, padding: 20, fontSize: 13, color: "var(--text-body)" }}>
          Couldn't reach the live PSE feed just now. This refreshes automatically every 30 seconds.
        </div>
      )}

      {!error && (
        <div className="stockex-stagger grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] gap-3">
          {/* Index proxy card — ambient glow tinted by direction */}
          <div
            className="stockex-card-lift"
            style={{
              ...glassCard,
              position: "relative", overflow: "hidden",
              padding: 22, display: "grid", gap: 16, alignContent: "space-between",
            }}
            onMouseEnter={(e) => glassHover(e, true)}
            onMouseLeave={(e) => glassHover(e, false)}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `radial-gradient(160px 160px at 90% -10%, rgba(${glowColor},0.14), transparent 70%)`,
              }}
            />
            <div style={{ position: "relative", display: "grid", gap: 10 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                PSEi-30 average move
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 700,
                  color: loading ? "var(--text-secondary)" : indexUp ? "var(--market-green)" : "var(--market-red)",
                  display: "flex", alignItems: "center", gap: 8, lineHeight: 1,
                }}
              >
                {!loading && (indexUp ? <TrendingUp size={22} /> : <TrendingDown size={22} />)}
                <AnimatedPercent value={data?.indexChangePercent ?? 0} loading={loading} />
              </span>
            </div>
            {data && (
              <div style={{ position: "relative", display: "grid", gap: 14 }}>
                <BreadthBar {...data.breadth} />
                {(data.gainers[0] || data.losers[0]) && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 4, borderTop: "1px solid var(--border)", fontSize: 12 }}>
                    {data.gainers[0] && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        Best <strong style={{ fontFamily: "var(--font-mono)", color: "var(--market-green)" }}>{data.gainers[0].symbol}</strong>{" "}
                        <span style={{ color: "var(--market-green)" }}>+{data.gainers[0].changePercent.toFixed(2)}%</span>
                      </span>
                    )}
                    {data.losers[0] && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        Worst <strong style={{ fontFamily: "var(--font-mono)", color: "var(--market-red)" }}>{data.losers[0].symbol}</strong>{" "}
                        <span style={{ color: "var(--market-red)" }}>{data.losers[0].changePercent.toFixed(2)}%</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gainers */}
          <div className="stockex-card-lift" style={{ ...glassCard, padding: "8px 0", display: "grid", gap: 0 }} onMouseEnter={(e) => glassHover(e, true)} onMouseLeave={(e) => glassHover(e, false)}>
            <span style={{ padding: "8px 14px 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--market-green)", display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowUpRight size={13} /> Top gainers
            </span>
            {loading && <span style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)" }}>Loading…</span>}
            {!loading && data?.gainers.map((q, i) => <QuoteRow key={q.symbol} q={q} index={i} onClick={() => navigate(`/stock/${q.symbol}`)} />)}
            {!loading && data && data.gainers.length === 0 && <span style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)" }}>No advancers right now.</span>}
          </div>

          {/* Losers */}
          <div className="stockex-card-lift" style={{ ...glassCard, padding: "8px 0", display: "grid", gap: 0 }} onMouseEnter={(e) => glassHover(e, true)} onMouseLeave={(e) => glassHover(e, false)}>
            <span style={{ padding: "8px 14px 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--market-red)", display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowDownRight size={13} /> Top losers
            </span>
            {loading && <span style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)" }}>Loading…</span>}
            {!loading && data?.losers.map((q, i) => <QuoteRow key={q.symbol} q={q} index={i} onClick={() => navigate(`/stock/${q.symbol}`)} />)}
            {!loading && data && data.losers.length === 0 && <span style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)" }}>No decliners right now.</span>}
          </div>

          {/* Most active */}
          <div className="stockex-card-lift" style={{ ...glassCard, padding: "8px 0", display: "grid", gap: 0 }} onMouseEnter={(e) => glassHover(e, true)} onMouseLeave={(e) => glassHover(e, false)}>
            <span style={{ padding: "8px 14px 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} /> Most active
            </span>
            {loading && <span style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)" }}>Loading…</span>}
            {!loading && data?.mostActive.map((q, i) => <QuoteRow key={q.symbol} q={q} index={i} onClick={() => navigate(`/stock/${q.symbol}`)} />)}
            {!loading && data && data.mostActive.length === 0 && <span style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)" }}>No activity to show.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
