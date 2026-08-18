import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { usePrediction, useLivePrices, type Prediction } from "../hooks/usePrediction";

/* ============================================================================
   PredictionPage — StockStory design (paper canvas, white cards, mono numerals).
   Live 50-factor momentum engine, real-data only.
   ============================================================================ */

const PSE_30 = [
  "AC","AEV","AGI","ALI","AP","BDO","BLOOM","BPI","CEB","CNPF",
  "CPG","DMC","DMP","FGEN","FMETF","FPI","GLO","GTCAP","ICT","IMI",
  "JFC","JGS","KPPI","LBC","LTG","MEG","MONDE","MPI","MWIDE","NIKL",
  "PCOR","PGOLD","PH","PIP","PRFM","PSE","RCB","RLC","ROCK","RRHI",
  "SCC","SECB","SGP","SHNG","SMC","SM","SMPH","SPC","SSI","STI",
  "TEL","TFC","UBP","URC","VLL","WLCON",
];

const CLASS_COLORS: Record<string, string> = {
  STRONG_BUY: "var(--sx-up)",
  BUY: "var(--sx-up)",
  HOLD: "var(--sx-gold)",
  SELL: "var(--sx-down)",
  STRONG_SELL: "var(--sx-down)",
};

/** Momentum score → color ladder on the design's up/down ramp. */
function momentumColor(value: number | null): string {
  if (value === null) return "var(--sx-ink-4)";
  return value >= 50 ? "var(--sx-up)" : value >= 35 ? "var(--sx-gold)" : "var(--sx-down)";
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--sx-up)" : score >= 65 ? "var(--sx-up)" : score >= 50 ? "var(--sx-gold)" : score >= 35 ? "var(--sx-gold)" : "var(--sx-down)";
  const offset = 138 - (138 * score) / 100;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--sx-rule-chart)" strokeWidth="4" />
      <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="4" strokeDasharray="138" strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="30" textAnchor="middle" fill="var(--sx-ink)" fontSize="11" fontWeight="600" fontFamily="var(--sx-mono)">{score}</text>
    </svg>
  );
}

function FactorBar({ label, value, max }: { label: string; value: unknown; max?: number }) {
  const numVal = typeof value === "number" ? value : 0;
  const pct = max ? Math.min(Math.abs(numVal) / max, 1) * 100 : Math.min(Math.abs(numVal), 100);
  const positive = numVal >= 0;
  const displayVal = typeof value === "number" ? value.toFixed(2) : typeof value === "string" ? value : "\u2014";
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--sx-ink-3)" }}>
        <span>{label}</span>
        <span className="n">{displayVal}</span>
      </div>
      <div style={{ height: "4px", background: "var(--sx-surface-sunken)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: positive ? "var(--sx-up)" : "var(--sx-down)", borderRadius: "2px", transition: "width 0.3s", opacity: 0.7 }} />
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--sx-surface)",
  border: "1px solid var(--sx-rule)",
  borderRadius: "var(--sx-radius-card)",
  padding: 20,
};

const pillStyle = (bg: string, color: string): CSSProperties => ({
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 600,
  background: bg,
  color,
});

function PredictionCard({ ticker, prediction, loading, failed, onRefresh }: { ticker: string; prediction: Prediction | null; loading: boolean; failed: boolean; onRefresh: (t: string) => void }) {
  if (!prediction) {
    return (
      <div style={cardStyle}>
        {failed && !loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "var(--sx-ink-3)", fontSize: "13px", margin: "0 0 12px" }}>
              Couldn't load a prediction for {ticker}.
            </p>
            <button
              onClick={() => onRefresh(ticker)}
              className="sx-btn-ghost"
              style={{ height: 34, padding: "0 14px", fontSize: 12.5 }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--sx-ink-3)", fontSize: "13px" }}>
            Searching {ticker}…
          </div>
        )}
      </div>
    );
  }
  const f = prediction.factors;
  const color = CLASS_COLORS[prediction.classification] || "var(--sx-ink-4)";
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, letterSpacing: "-0.01em" }}>{ticker}</h3>
          {prediction.sector && <span style={{ fontSize: "11.5px", color: "var(--sx-ink-3)" }}>{prediction.sector}</span>}
        </div>
        <ScoreGauge score={Math.round(prediction.composite_score)} />
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
        <span style={pillStyle("var(--sx-up-bg)", color)}>{prediction.classification}</span>
        <span style={pillStyle("var(--sx-surface-quiet)", "var(--sx-ink-2)")} className="n">{prediction.confidence}% confidence</span>
        <span style={pillStyle("var(--sx-surface-quiet)", "var(--sx-ink-2)")} className="n">{prediction.factor_count} factors</span>
        {prediction.price && (
          <span style={pillStyle("var(--sx-surface-quiet)", "var(--sx-ink-2)")} className="n">₱{prediction.price.toFixed(2)}</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--sx-ink-3)", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Technical</p>
          <FactorBar label="RSI" value={f.rsi_14} max={100} />
          <FactorBar label="Signal" value={f.rsi_signal} />
          <FactorBar label="Trend" value={f.trend} />
          <FactorBar label="Momentum 1M" value={f.momentum_1m} max={30} />
          <FactorBar label="Volume Ratio" value={f.volume_ratio} max={3} />
          <FactorBar label="BB %" value={f.bb_pct} max={100} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "var(--sx-ink-3)", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fundamental</p>
          <FactorBar label="P/E" value={f.pe_ratio} max={50} />
          <FactorBar label="ROE" value={f.roe} max={50} />
          <FactorBar label="ROCE" value={f.roce} max={30} />
          <FactorBar label="D/E" value={f.debt_to_equity} max={3} />
          <FactorBar label="Revenue Growth" value={f.revenue_growth} max={50} />
          <FactorBar label="Profit Margin" value={f.profit_margin} max={30} />
        </div>
      </div>

      {/* Momentum Breakdown Sub-scores */}
      {prediction.momentumBreakdown && (
        <div style={{ marginTop: "16px", padding: "12px", background: "var(--sx-surface-quiet)", borderRadius: "8px", border: "1px solid var(--sx-rule)" }}>
          <p style={{ fontSize: "11px", color: "var(--sx-ink-3)", margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Momentum Breakdown (from real EODHD data)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--sx-ink-4)" }}>Short Term</div>
              <div className="n" style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.shortTerm) }}>{prediction.momentumBreakdown.shortTerm !== null ? prediction.momentumBreakdown.shortTerm : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--sx-ink-4)" }}>Medium Term</div>
              <div className="n" style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.mediumTerm) }}>{prediction.momentumBreakdown.mediumTerm !== null ? prediction.momentumBreakdown.mediumTerm : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--sx-ink-4)" }}>Trend</div>
              <div className="n" style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.trend) }}>{prediction.momentumBreakdown.trend !== null ? prediction.momentumBreakdown.trend : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--sx-ink-4)" }}>Overall</div>
              <div className="n" style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.overall) }}>{prediction.momentumBreakdown.overall !== null ? prediction.momentumBreakdown.overall : "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--sx-ink-3)", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Valuation</p>
          <FactorBar label="P/B" value={f.pb_ratio} max={10} />
          <FactorBar label="PEG" value={f.peg_ratio} max={5} />
          <FactorBar label="Target Upside" value={f.target_upside} max={50} />
          <FactorBar label="FCF Yield" value={f.fcf_yield} max={15} />
          <FactorBar label="EV/EBITDA" value={f.ev_ebitda} max={30} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "var(--sx-ink-3)", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Risk</p>
          <FactorBar label="Beta" value={f.beta} max={2} />
          <FactorBar label="Risk Level" value={f.risk_level} />
          <FactorBar label="VaR 95%" value={f.var_95} max={100} />
          <FactorBar label="Volatility" value={f.volatility_20d} max={10} />
          <FactorBar label="52W Position" value={f.position_52w} max={100} />
        </div>
      </div>

      <button
        onClick={() => onRefresh(ticker)}
        className="sx-btn-ghost"
        style={{ marginTop: "12px", width: "100%", height: 36, fontSize: "12.5px" }}
      >
        Refresh Prediction
      </button>
    </div>
  );
}

function LivePricePanel({ prices, onRefresh }: { prices: Array<{ ticker: string; price: number; change_pct?: number; user_id: string }>; onRefresh: () => void }) {
  if (prices.length === 0) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Live Prices (User-Sourced)</h2>
        <button onClick={onRefresh} className="sx-btn-ghost" style={{ height: 32, padding: "0 12px", fontSize: "11.5px" }}>
          Refresh
        </button>
      </div>
      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
        {prices.map((p) => {
          const chg = p.change_pct ?? 0;
          const up = chg >= 0;
          return (
            <div key={p.ticker} style={{ background: "var(--sx-surface)", border: "1px solid var(--sx-rule)", borderRadius: "10px", padding: "10px 14px", flexShrink: 0, minWidth: "120px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.ticker}</div>
              <div className="n" style={{ fontSize: "15px", fontWeight: 600, margin: "2px 0" }}>₱{p.price.toFixed(2)}</div>
              <div className="n" style={{ fontSize: "11px", color: up ? "var(--sx-up)" : "var(--sx-down)" }}>{up ? "▲" : "▼"} {chg.toFixed(2)}%</div>
              <div style={{ fontSize: "9px", color: "var(--sx-ink-4)", marginTop: "2px" }}>by {p.user_id.slice(0, 8)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  fontSize: "12.5px",
  border: "1px solid var(--sx-rule-input)",
  borderRadius: "var(--sx-radius-field)",
  background: "var(--sx-surface)",
  color: "var(--sx-ink)",
  outline: "none",
};

function SubmissionsPanel({ userId }: { userId: string }) {
  const [ticker, setTicker] = useState("");
  const [price, setPrice] = useState("");
  const [volume, setVolume] = useState("");
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleSubmit = async () => {
    if (!ticker || !price) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/ai/live-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          price: parseFloat(price),
          user_id: userId,
          source: "web",
          volume: volume ? parseInt(volume) : undefined,
          bid: bid ? parseFloat(bid) : undefined,
          ask: ask ? parseFloat(ask) : undefined,
        }),
      });
      if (res.ok) {
        setStatus("done");
        setMsg("Price submitted! Shared with all users for 10 min.");
        setTicker(""); setPrice(""); setVolume(""); setBid(""); setAsk("");
      } else {
        const d = await res.json();
        setStatus("error");
        setMsg(d.error || "Submission failed");
      }
    } catch {
      setStatus("error");
      setMsg("Network error");
    }
  };

  return (
    <div style={{ ...cardStyle, marginTop: "24px" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600 }}>Submit Price (User-as-Data-Source)</h2>
      <p style={{ fontSize: "11.5px", color: "var(--sx-ink-3)", marginBottom: "14px" }}>
        Your submission is cached for 10 minutes and shared with all users. Outliers &gt;50% from current price are rejected.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="TICKER" style={inputStyle} maxLength={10} />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inputStyle} />
        <input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="Volume (optional)" type="number" style={inputStyle} />
        <input value={bid} onChange={(e) => setBid(e.target.value)} placeholder="Bid (optional)" type="number" step="0.01" style={inputStyle} />
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask (optional)" type="number" step="0.01" style={inputStyle} />
      </div>
      <button onClick={handleSubmit} disabled={status === "submitting"} className="sx-btn-sm" style={{ marginTop: "10px", width: "100%" }}>
        {status === "submitting" ? "Submitting..." : status === "done" ? "✓ Submitted" : "Submit Price"}
      </button>
      {msg && <p style={{ fontSize: "11.5px", color: status === "done" ? "var(--sx-up)" : "var(--sx-down)", margin: "6px 0 0" }}>{msg}</p>}
    </div>
  );
}

export default function PredictionPage() {
  const [search, setSearch] = useState("");
  const [tickers, setTickers] = useState<string[]>(["AC", "BDO", "JFC", "SMPH"]);
  const [predictions, setPredictions] = useState<Record<string, Prediction | null>>({});
  const { getPrediction } = usePrediction();
  const { prices, fetchPrices } = useLivePrices();
  const [loadingTickers, setLoadingTickers] = useState<Set<string>>(new Set());
  const [failedTickers, setFailedTickers] = useState<Set<string>>(new Set());

  const fetchPrediction = useCallback(async (t: string) => {
    setLoadingTickers((prev) => new Set(prev).add(t));
    setFailedTickers((prev) => { const n = new Set(prev); n.delete(t); return n; });
    const pred = await getPrediction(t);
    setPredictions((prev) => ({ ...prev, [t]: pred }));
    setLoadingTickers((prev) => { const n = new Set(prev); n.delete(t); return n; });
    if (!pred) setFailedTickers((prev) => new Set(prev).add(t));
  }, [getPrediction]);

  useEffect(() => {
    tickers.forEach((t) => fetchPrediction(t));
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTicker = () => {
    const s = search.toUpperCase().trim();
    if (s && !tickers.includes(s)) {
      setTickers((prev) => [...prev, s]);
      fetchPrediction(s);
      setSearch("");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <p className="sx-eyebrow" style={{ marginBottom: 6 }}>Live Rankings</p>
        <h1 className="sx-h1" style={{ marginBottom: 8 }}>Stock Predictions</h1>
        <p style={{ fontSize: "13px", color: "var(--sx-ink-3)", margin: 0 }}>
          50-factor composite engine · User-sourced live prices · Real data only
        </p>
      </div>

      <LivePricePanel prices={prices} onRefresh={fetchPrices} />

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTicker()}
          placeholder="Search PSE ticker (e.g. AC, BDO, JFC)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={addTicker} className="sx-btn-sm">Analyze</button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {PSE_30.slice(0, 12).map((t) => {
          const active = tickers.includes(t);
          return (
            <button
              key={t}
              onClick={() => { if (!active) { setTickers((prev) => [...prev, t]); fetchPrediction(t); } }}
              className="n"
              style={{
                padding: "4px 10px", fontSize: "11px", border: `1px solid ${active ? "var(--sx-up)" : "var(--sx-rule-strong)"}`,
                borderRadius: "999px",
                background: active ? "var(--sx-up-bg)" : "var(--sx-surface)",
                color: active ? "var(--sx-up)" : "var(--sx-ink-3)", cursor: "pointer",
                fontWeight: active ? 600 : 500,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
        {tickers.map((t) => (
          <PredictionCard key={t} ticker={t} prediction={predictions[t]} loading={loadingTickers.has(t)} failed={failedTickers.has(t)} onRefresh={fetchPrediction} />
        ))}
      </div>

      <SubmissionsPanel userId={`user_${Math.random().toString(36).slice(2, 8)}`} />

      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 600, margin: "0 0 8px", color: "var(--sx-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>About the Prediction Engine</h3>
        <div style={{ fontSize: "11.5px", color: "var(--sx-ink-3)", lineHeight: 1.6 }}>
          <p>This engine analyzes stocks across <strong style={{ color: "var(--sx-ink)" }}>50+ factors</strong> in real-time using only real data:</p>
          <ul style={{ paddingLeft: "16px", margin: 0 }}>
            <li><strong style={{ color: "var(--sx-ink)" }}>Technical</strong> — RSI, MACD, Bollinger Bands, ADX, ATR, Stochastic</li>
            <li><strong style={{ color: "var(--sx-ink)" }}>Fundamental</strong> — P/E, ROE, ROCE, debt/equity, margins, revenue growth</li>
            <li><strong style={{ color: "var(--sx-ink)" }}>Valuation</strong> — P/B, PEG, EV/EBITDA, FCF yield, analyst targets</li>
            <li><strong style={{ color: "var(--sx-ink)" }}>Quality</strong> — Piotroski score, promoter/FII holdings, dividend consistency</li>
            <li><strong style={{ color: "var(--sx-ink)" }}>Risk</strong> — Beta, volatility, VaR 95%, drawdown, debt-servicing ability</li>
            <li><strong style={{ color: "var(--sx-ink)" }}>Momentum</strong> — 1-day, 1-week, 1-month, 3-month price action</li>
          </ul>
          <p>Data sources: Market data platforms and user-submitted live prices.</p>
        </div>
      </div>
    </div>
  );
}
