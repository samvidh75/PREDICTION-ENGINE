import { useState, useCallback } from "react";
import { Play, RotateCcw, TrendingUp, TrendingDown, BarChart3, Activity, Hash, DollarSign, Percent, Sigma, Zap, AlertTriangle, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Card, CardLabel } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, typography, radius } from "../design/tokens";
import { backtestEngine, type BacktestResult, type BacktestInput, type StrategyType, type PriceBar } from "../services/backtest/BacktestEngine";

const STRATEGIES: { value: StrategyType; label: string; desc: string; params: { key: string; label: string; default: number; min: number; max: number; step: number }[] }[] = [
  { value: "ma_crossover", label: "MA Crossover", desc: "Buy when fast MA crosses above slow MA",
    params: [
      { key: "fastPeriod", label: "Fast Period", default: 20, min: 5, max: 100, step: 1 },
      { key: "slowPeriod", label: "Slow Period", default: 50, min: 20, max: 200, step: 1 },
    ] },
  { value: "rsi", label: "RSI", desc: "Buy when RSI exits oversold, sell when overbought",
    params: [
      { key: "period", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
      { key: "oversold", label: "Oversold", default: 30, min: 10, max: 50, step: 1 },
      { key: "overbought", label: "Overbought", default: 70, min: 50, max: 90, step: 1 },
    ] },
  { value: "macd", label: "MACD", desc: "Buy when MACD crosses above signal line",
    params: [] },
  { value: "bollinger", label: "Bollinger", desc: "Buy at lower band bounce, sell at upper band",
    params: [
      { key: "period", label: "BB Period", default: 20, min: 10, max: 50, step: 1 },
      { key: "stdDev", label: "Std Dev", default: 2, min: 1, max: 4, step: 0.5 },
    ] },
  { value: "buy_hold", label: "Buy & Hold", desc: "Buy at start, hold till end",
    params: [] },
];

function generateMockBars(startDate: string, endDate: string): PriceBar[] {
  const bars: PriceBar[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let price = 100 + Math.random() * 5000;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price += (Math.random() - 0.48) * price * 0.02;
    price = Math.max(price, 1);
    bars.push({
      date: d.toISOString().split("T")[0],
      open: price * (1 + (Math.random() - 0.5) * 0.005),
      high: price * (1 + Math.random() * 0.015),
      low: price * (1 - Math.random() * 0.015),
      close: Math.round(price * 100) / 100,
      volume: Math.round(500000 + Math.random() * 5000000),
    });
  }
  return bars;
}

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [strategy, setStrategy] = useState<StrategyType>("ma_crossover");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [initialCapital, setInitialCapital] = useState("100000");
  const [params, setParams] = useState<Record<string, number>>({ fastPeriod: 20, slowPeriod: 50, period: 14, oversold: 30, overbought: 70, stdDev: 2 });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrades, setShowTrades] = useState(false);
  const [showEquity, setShowEquity] = useState(false);

  const currentStrategy = STRATEGIES.find((s) => s.value === strategy)!;

  const handleParamChange = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const runBacktest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const input: BacktestInput = {
        symbol: symbol.toUpperCase(),
        strategy,
        startDate,
        endDate,
        initialCapital: parseFloat(initialCapital) || 100000,
        params,
      };
      const priceBars = generateMockBars(startDate, endDate);
      const res = await backtestEngine.run(input, priceBars);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  }, [symbol, strategy, startDate, endDate, initialCapital, params]);

  const resultCards = result ? [
    { label: "Final Capital", value: formatCurrency(result.finalCapital), color: result.finalCapital >= result.initialCapital ? colors.marketGreen : colors.marketRed },
    { label: "Total Return", value: formatPct(result.totalReturnsPercent), color: result.totalReturnsPercent >= 0 ? colors.marketGreen : colors.marketRed },
    { label: "CAGR", value: formatPct(result.cagr), color: result.cagr >= 0 ? colors.marketGreen : colors.marketRed },
    { label: "Sharpe Ratio", value: result.sharpeRatio.toFixed(2), color: result.sharpeRatio >= 1 ? colors.marketGreen : result.sharpeRatio >= 0 ? colors.warning : colors.marketRed },
    { label: "Win Rate", value: formatPct(result.winRate), color: result.winRate >= 50 ? colors.marketGreen : colors.marketRed },
    { label: "Max Drawdown", value: formatPct(-result.maxDrawdownPercent), color: colors.marketRed },
    { label: "Total Trades", value: String(result.totalTrades), color: colors.textPrimary },
    { label: "Profit Factor", value: result.profitFactor === Infinity ? "∞" : result.profitFactor.toFixed(2), color: result.profitFactor >= 1.5 ? colors.marketGreen : colors.marketRed },
    { label: "Alpha", value: formatPct(result.alpha), color: result.alpha >= 0 ? colors.marketGreen : colors.marketRed },
    { label: "Buy & Hold Return", value: formatPct(result.buyHoldReturns), color: colors.textSecondary },
  ] : [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gap: 16 }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <Activity size={24} color={colors.primary} /> Backtest
        </h1>
        <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>Test trading strategies on historical data</p>
      </section>

      <Card>
        <div style={{ display: "grid", gap: 16 }}>
          <CardLabel>Configuration</CardLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 140px", minWidth: 120 }}>
              <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Symbol</span>
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: "1 1 140px", minWidth: 120 }}>
              <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Start Date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: "1 1 140px", minWidth: 120 }}>
              <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>End Date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: "0 1 120px" }}>
              <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Capital (₹)</span>
              <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)}
                style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Strategy</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STRATEGIES.map((s) => (
                <button key={s.value} onClick={() => { setStrategy(s.value); }}
                  style={{
                    padding: "8px 14px", borderRadius: radius.md, border: `1px solid ${strategy === s.value ? colors.primary : colors.border}`,
                    background: strategy === s.value ? `${colors.primary}15` : "transparent",
                    color: strategy === s.value ? colors.primary : colors.textSecondary,
                    cursor: "pointer", fontSize: 12, fontWeight: 500,
                    transition: "all 0.15s ease",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: colors.textTertiary, margin: "6px 0 0" }}>{currentStrategy.desc}</p>
          </div>

          {currentStrategy.params.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {currentStrategy.params.map((p) => (
                <div key={p.key} style={{ flex: "0 1 100px" }}>
                  <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{p.label}</span>
                  <input type="number" min={p.min} max={p.max} step={p.step} value={params[p.key] ?? p.default}
                    onChange={(e) => handleParamChange(p.key, e.target.value)}
                    style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" onClick={runBacktest} disabled={loading}>
              <Play size={14} /> {loading ? "Running…" : "Run Backtest"}
            </Button>
            <Button variant="tertiary" size="sm" onClick={() => { setResult(null); setError(null); }}>
              <RotateCcw size={14} /> Reset
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card style={{ borderLeft: `3px solid ${colors.danger}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color={colors.danger} />
            <span style={{ fontSize: 13, color: colors.danger }}>{error}</span>
          </div>
        </Card>
      )}

      {loading && (
        <Card><div style={{ textAlign: "center", padding: "40px", color: colors.textSecondary, fontSize: 13 }}>Running backtest simulation…</div></Card>
      )}

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {resultCards.map((rc) => (
              <Card key={rc.label} style={{ padding: "14px 16px" }}>
                <CardLabel>{rc.label}</CardLabel>
                <span style={{ fontSize: 18, fontWeight: 700, color: rc.color }}>{rc.value}</span>
              </Card>
            ))}
          </div>

          <Card>
            <button onClick={() => setShowEquity(!showEquity)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", border: "none", background: "transparent", cursor: "pointer", color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={14} /> Equity Curve</span>
              {showEquity ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showEquity && (
              <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: colors.textTertiary, fontSize: 11 }}>Date</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: colors.textTertiary, fontSize: 11 }}>Portfolio Value</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: colors.textTertiary, fontSize: 11 }}>Daily Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.equityCurve.map((e, i) => {
                      const prev = result.equityCurve[i - 1]?.value ?? e.value;
                      const dailyReturn = ((e.value - prev) / prev) * 100;
                      return (
                        <tr key={e.date} style={{ borderBottom: i < result.equityCurve.length - 1 ? `1px solid ${colors.hairline}` : "none" }}>
                          <td style={{ padding: "6px 8px", color: colors.textSecondary }}>{e.date}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: colors.textPrimary }}>{formatCurrency(e.value)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: dailyReturn >= 0 ? colors.marketGreen : colors.marketRed }}>
                            {formatPct(dailyReturn)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: colors.textTertiary, margin: "8px 0 0", textAlign: "center" }}>
                  Start: {formatCurrency(result.equityCurve[0]?.value ?? 0)} → End: {formatCurrency(result.equityCurve[result.equityCurve.length - 1]?.value ?? 0)}
                  {" | "}Peak: {formatCurrency(Math.max(...result.equityCurve.map((e) => e.value)))}
                  {" | "}Trough: {formatCurrency(Math.min(...result.equityCurve.map((e) => e.value)))}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <button onClick={() => setShowTrades(!showTrades)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", border: "none", background: "transparent", cursor: "pointer", color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Hash size={14} /> Trade Journal ({result.trades.length} trades)</span>
              {showTrades ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTrades && (
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      {["#", "Entry", "Entry Price", "Exit", "Exit Price", "Qty", "P&L", "Return", "Reason"].map((h) => (
                        <th key={h} style={{ padding: "8px", textAlign: "right", color: colors.textTertiary, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {h === "#" || h === "Entry" || h === "Exit" || h === "Reason" ? <span style={{ textAlign: "left", display: "block" }}>{h}</span> : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} style={{ borderBottom: i < result.trades.length - 1 ? `1px solid ${colors.hairline}` : "none" }}>
                        <td style={{ padding: "8px", color: colors.textTertiary, textAlign: "left" }}>{i + 1}</td>
                        <td style={{ padding: "8px", color: colors.textSecondary, textAlign: "left" }}>{t.entryDate}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 500, color: colors.textPrimary }}>
                          {formatCurrency(t.entryPrice)}
                        </td>
                        <td style={{ padding: "8px", color: colors.textSecondary, textAlign: "left" }}>{t.exitDate}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 500, color: colors.textPrimary }}>
                          {formatCurrency(t.exitPrice)}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", color: colors.textSecondary }}>{t.quantity}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: t.pnl >= 0 ? colors.marketGreen : colors.marketRed }}>
                          {formatCurrency(t.pnl)}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: t.pnlPercent >= 0 ? colors.marketGreen : colors.marketRed }}>
                          {formatPct(t.pnlPercent)}
                        </td>
                        <td style={{ padding: "8px", color: colors.textTertiary, textAlign: "left", fontSize: 11 }}>{t.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div style={{ fontSize: 12, color: colors.textTertiary, textAlign: "center" }}>
            Strategy: {result.strategy} · {result.symbol} · {result.startDate} → {result.endDate}
            {" · "}Using mock price data • Not financial advice
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <Card>
          <div style={{ textAlign: "center", padding: "40px 0", color: colors.textSecondary, fontSize: 13 }}>
            Configure your backtest parameters and click "Run Backtest" to see results
          </div>
        </Card>
      )}
    </div>
  );
}
