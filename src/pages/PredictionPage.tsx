import { useState, useEffect, useCallback } from "react";
import { usePrediction, useLivePrices, type Prediction } from "../hooks/usePrediction";

const PSE_30 = [
  "AC","AEV","AGI","ALI","AP","BDO","BLOOM","BPI","CEB","CNPF",
  "CPG","DMC","DMP","FGEN","FMETF","FPI","GLO","GTCAP","ICT","IMI",
  "JFC","JGS","KPPI","LBC","LTG","MEG","MONDE","MPI","MWIDE","NIKL",
  "PCOR","PGOLD","PH","PIP","PRFM","PSE","RCB","RLC","ROCK","RRHI",
  "SCC","SECB","SGP","SHNG","SMC","SM","SMPH","SPC","SSI","STI",
  "TEL","TFC","UBP","URC","VLL","WLCON",
];

const CLASS_COLORS: Record<string, string> = {
  STRONG_BUY: "#34C759",
  BUY: "#7BD88F",
  HOLD: "#FF9500",
  SELL: "#FFB340",
  STRONG_SELL: "#FF3B30",
};

/** Token-aligned momentum score → color ladder (0–100 sub-score). */
function momentumColor(value: number | null): string {
  if (value === null) return "rgba(255,255,255,0.3)";
  return value >= 50 ? "#34C759" : value >= 35 ? "#FF9500" : "#FF3B30";
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#34C759" : score >= 65 ? "#7BD88F" : score >= 50 ? "#FF9500" : score >= 35 ? "#FFB340" : "#FF3B30";
  const offset = 138 - (138 * score) / 100;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="4" strokeDasharray="138" strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{score}</text>
    </svg>
  );
}

function FactorBar({ label, value, max }: { label: string; value: unknown; max?: number }) {
  const numVal = typeof value === "number" ? value : 0;
  const pct = max ? Math.min(Math.abs(numVal) / max, 1) * 100 : Math.min(Math.abs(numVal), 100);
  const positive = numVal >= 0;
  const displayVal = typeof value === "number" ? value.toFixed(2) : typeof value === "string" ? value : "\u2014";
  return (
    <div style={{ marginBottom: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
        <span>{label}</span>
        <span>{displayVal}</span>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: positive ? "rgba(52,199,89,0.7)" : "rgba(255,59,48,0.7)", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function PredictionCard({ ticker, prediction, loading, failed, onRefresh }: { ticker: string; prediction: Prediction | null; loading: boolean; failed: boolean; onRefresh: (t: string) => void }) {
  if (!prediction) {
    return (
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "20px" }}>
        {failed && !loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 12px" }}>
              Couldn't load a prediction for {ticker}.
            </p>
            <button
              onClick={() => onRefresh(ticker)}
              style={{ padding: "6px 14px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", background: "transparent", color: "#FF6B4A", cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            Searching {ticker}...
          </div>
        )}
      </div>
    );
  }
  const f = prediction.factors;
  const color = CLASS_COLORS[prediction.classification] || "rgba(255,255,255,0.5)";
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{ticker}</h3>
          {prediction.sector && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{prediction.sector}</span>}
        </div>
        <ScoreGauge score={Math.round(prediction.composite_score)} />
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
        <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: `${color}22`, color }}>
          {prediction.classification}
        </span>
        <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
          {prediction.confidence}% confidence
        </span>
        <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
          {prediction.factor_count} factors
        </span>
          {prediction.price && (
          <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
            ₱{prediction.price.toFixed(2)}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px", fontWeight: 600 }}>Technical</p>
          <FactorBar label="RSI" value={f.rsi_14} max={100} />
          <FactorBar label="Signal" value={f.rsi_signal} />
          <FactorBar label="Trend" value={f.trend} />
          <FactorBar label="Momentum 1M" value={f.momentum_1m} max={30} />
          <FactorBar label="Volume Ratio" value={f.volume_ratio} max={3} />
          <FactorBar label="BB %" value={f.bb_pct} max={100} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px", fontWeight: 600 }}>Fundamental</p>
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
        <div style={{ marginTop: "16px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "0 0 8px", fontWeight: 600 }}>Momentum Breakdown (from real EODHD data)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Short Term</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.shortTerm) }}>{prediction.momentumBreakdown.shortTerm !== null ? prediction.momentumBreakdown.shortTerm : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Medium Term</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.mediumTerm) }}>{prediction.momentumBreakdown.mediumTerm !== null ? prediction.momentumBreakdown.mediumTerm : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Trend</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.trend) }}>{prediction.momentumBreakdown.trend !== null ? prediction.momentumBreakdown.trend : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Overall</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: momentumColor(prediction.momentumBreakdown.overall) }}>{prediction.momentumBreakdown.overall !== null ? prediction.momentumBreakdown.overall : "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px", fontWeight: 600 }}>Valuation</p>
          <FactorBar label="P/B" value={f.pb_ratio} max={10} />
          <FactorBar label="PEG" value={f.peg_ratio} max={5} />
          <FactorBar label="Target Upside" value={f.target_upside} max={50} />
          <FactorBar label="FCF Yield" value={f.fcf_yield} max={15} />
          <FactorBar label="EV/EBITDA" value={f.ev_ebitda} max={30} />
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px", fontWeight: 600 }}>Risk</p>
          <FactorBar label="Beta" value={f.beta} max={2} />
          <FactorBar label="Risk Level" value={f.risk_level} />
          <FactorBar label="VaR 95%" value={f.var_95} max={100} />
          <FactorBar label="Volatility" value={f.volatility_20d} max={10} />
          <FactorBar label="52W Position" value={f.position_52w} max={100} />
        </div>
      </div>

      <button
        onClick={() => onRefresh(ticker)}
        style={{ marginTop: "12px", padding: "6px 12px", fontSize: "11px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", width: "100%" }}
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
        <button onClick={onRefresh} style={{ padding: "4px 10px", fontSize: "11px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          Refresh
        </button>
      </div>
      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
        {prices.map((p) => {
          const chg = p.change_pct ?? 0;
          const arrow = chg >= 0 ? "▲" : "▼";
          return (
            <div key={p.ticker} style={{ background: "rgba(52,199,89,0.04)", border: "1px solid rgba(52,199,89,0.1)", borderRadius: "8px", padding: "10px 14px", flexShrink: 0, minWidth: "120px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.ticker}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, margin: "2px 0" }}>₱{p.price.toFixed(2)}</div>
              <div style={{ fontSize: "11px", color: chg >= 0 ? "#34C759" : "#FF3B30" }}>{arrow} {chg.toFixed(2)}%</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>by {p.user_id.slice(0, 8)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    <div style={{ marginTop: "24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "20px" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600 }}>Submit Price (User-as-Data-Source)</h2>
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "14px" }}>
        Your submission is cached for 10 minutes and shared with all users. Outliers &gt;50% from current price are rejected.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="TICKER" style={inputStyle} maxLength={10} />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inputStyle} />
        <input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="Volume (optional)" type="number" style={inputStyle} />
        <input value={bid} onChange={(e) => setBid(e.target.value)} placeholder="Bid (optional)" type="number" step="0.01" style={inputStyle} />
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask (optional)" type="number" step="0.01" style={inputStyle} />
      </div>
      <button onClick={handleSubmit} disabled={status === "submitting"} style={{
        marginTop: "10px", padding: "8px 16px", fontSize: "13px", border: "none", borderRadius: "8px",
        background: status === "done" ? "rgba(52,199,89,0.2)" : "rgba(52,199,89,0.15)",
        color: status === "done" ? "#34C759" : "#7BD88F", cursor: "pointer", width: "100%",
      }}>
        {status === "submitting" ? "Submitting..." : status === "done" ? "✓ Submitted" : "Submit Price"}
      </button>
      {msg && <p style={{ fontSize: "11px", color: status === "done" ? "#34C759" : "#FFB340", margin: "6px 0 0" }}>{msg}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
  background: "rgba(255,255,255,0.04)", color: "white", outline: "none",
};

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
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>Stock Predictions</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
          50-factor composite engine • User-sourced live prices • Real data only
        </p>
      </div>

      <LivePricePanel prices={prices} onRefresh={fetchPrices} />

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTicker()}
          placeholder="Search PSE ticker (e.g. AC, BDO, JFC)"
          style={{
            flex: 1, padding: "10px 14px", fontSize: "13px", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", background: "rgba(255,255,255,0.04)", color: "white", outline: "none",
          }}
        />
        <button onClick={addTicker} style={{
          padding: "10px 20px", fontSize: "13px", border: "none", borderRadius: "8px",
          background: "rgba(255,107,74,0.2)", color: "#FF6B4A", cursor: "pointer", fontWeight: 600,
        }}>
          Analyze
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {PSE_30.slice(0, 12).map((t) => (
          <button
            key={t}
            onClick={() => { if (!tickers.includes(t)) { setTickers((prev) => [...prev, t]); fetchPrediction(t); } }}
            style={{
              padding: "4px 10px", fontSize: "10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px",
              background: tickers.includes(t) ? "rgba(255,107,74,0.15)" : "transparent",
              color: tickers.includes(t) ? "#FF6B4A" : "rgba(255,255,255,0.4)", cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
        {tickers.map((t) => (
          <PredictionCard key={t} ticker={t} prediction={predictions[t]} loading={loadingTickers.has(t)} failed={failedTickers.has(t)} onRefresh={fetchPrediction} />
        ))}
      </div>

      <SubmissionsPanel userId={`user_${Math.random().toString(36).slice(2, 8)}`} />

      <div style={{ marginTop: "32px", padding: "16px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 600, margin: "0 0 8px", color: "rgba(255,255,255,0.4)" }}>About the Prediction Engine</h3>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
          <p>This engine analyzes stocks across <strong>50+ factors</strong> in real-time using only real data:</p>
          <ul style={{ paddingLeft: "16px", margin: 0 }}>
            <li><strong>Technical</strong> — RSI, MACD, Bollinger Bands, ADX, ATR, Stochastic</li>
            <li><strong>Fundamental</strong> — P/E, ROE, ROCE, debt/equity, margins, revenue growth</li>
            <li><strong>Valuation</strong> — P/B, PEG, EV/EBITDA, FCF yield, analyst targets</li>
            <li><strong>Quality</strong> — Piotroski score, promoter/FII holdings, dividend consistency</li>
            <li><strong>Risk</strong> — Beta, volatility, VaR 95%, drawdown, debt-servicing ability</li>
            <li><strong>Momentum</strong> — 1-day, 1-week, 1-month, 3-month price action</li>
          </ul>
          <p>Data sources: Market data platforms and user-submitted live prices.</p>
        </div>
      </div>
    </div>
  );
}
