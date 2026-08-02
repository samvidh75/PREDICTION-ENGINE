/**
 * BacktestPage — real, honest, illustrative backtest.
 *
 * Backed by api/backtest.ts, which runs a plain SMA-50 crossover strategy
 * over real EODHD daily OHLCV for a curated set of liquid PSEi names.
 * EODHD's free tier caps real history at ~1 year, so this can never show
 * more than that — the banner and dataWindow fields below say so
 * explicitly rather than implying a longer track record. All numbers
 * (equity curve, CAGR-equivalent, drawdown, win rate, trade count) are
 * computed from real prices via src/services/backtest/PerformanceMetrics.ts;
 * nothing here is fabricated. A provider failure surfaces as an explicit
 * "temporarily unavailable" state, never silently substituted numbers.
 *
 * Lives at /backtest
 */

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle } from "lucide-react";
import { colors, typography, layout, radius } from "../design/tokens";
import { Card, CardLabel } from "../ui/Card";
import {
  LazyAreaChart as AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "../components/DynamicChart";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface BacktestResponse {
  ok: true;
  strategy: { name: string; description: string; disclaimer: string };
  dataWindow: { startDate: string | null; endDate: string | null; tradingDays: number; dataSource: string; limitation: string };
  universe: {
    requested: number;
    included: Array<{ symbol: string; name: string; barsUsed?: number; trades?: number }>;
    excluded: Array<{ symbol: string; name: string; reason?: string }>;
  };
  metrics: {
    totalReturnPct: number;
    annualizedReturnPct: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdownPct: number;
    maxDrawdownDurationDays: number;
    winRate: number;
    volatilityAnnualized: number;
    numPeriods: number;
    totalTrades: number;
  };
  equityCurve: Array<{ date: string; value: number }>;
  pastPerformanceDisclaimer: string;
}

async function fetchBacktest(): Promise<BacktestResponse> {
  const res = await fetch(`${API_BASE}/api/backtest`);
  if (!res.ok) throw new Error("Backtest temporarily unavailable");
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Backtest temporarily unavailable");
  return data;
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div style={{ padding: "16px", background: colors.page, borderRadius: radius.md }}>
      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: tone === "positive" ? colors.marketGreen : tone === "negative" ? colors.danger : colors.textPrimary,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DisclosureBanner({ limitation, disclaimer, pastPerformance }: { limitation: string; disclaimer: string; pastPerformance: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "16px 20px",
        borderRadius: radius.md,
        background: "rgba(255, 149, 0, 0.08)",
        border: `1px solid ${colors.warning}`,
        marginBottom: 24,
      }}
    >
      <AlertTriangle size={20} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: colors.textPrimary }}>
        <strong>Illustrative example only — not investment advice.</strong> {disclaimer} {limitation} {pastPerformance}
      </div>
    </div>
  );
}

export default function BacktestPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["backtest"],
    queryFn: fetchBacktest,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  return (
    <main className="raycast-slideUp" style={{ maxWidth: 1000, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Activity size={22} color={colors.textSecondary} />
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, margin: 0 }}>Backtest</h1>
        </div>
        <p style={{ fontSize: 14.5, color: colors.textSecondary, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
          A simple SMA-50 crossover strategy run over real daily PSE prices, for research and illustration only.
        </p>
      </section>

      {isLoading && (
        <Card>
          <p style={{ color: colors.textSecondary, fontSize: 14.5, margin: 0 }}>Running backtest against real historical prices…</p>
        </Card>
      )}

      {isError && !isLoading && (
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={20} color={colors.danger} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: "0 0 4px", color: colors.textPrimary, fontWeight: 600 }}>Backtest temporarily unavailable</p>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: 13.5 }}>
                {error instanceof Error ? error.message : "Historical price data could not be reached."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {data && !isLoading && !isError && (
        <>
          <DisclosureBanner
            limitation={data.dataWindow.limitation}
            disclaimer={data.strategy.disclaimer}
            pastPerformance={data.pastPerformanceDisclaimer}
          />

          <Card style={{ marginBottom: 24 }}>
            <CardLabel>{data.strategy.name}</CardLabel>
            <p style={{ marginTop: 12, marginBottom: 0, color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
              {data.strategy.description}
            </p>
            <p style={{ marginTop: 12, marginBottom: 0, color: colors.textSecondary, fontSize: 13 }}>
              Data window: {data.dataWindow.startDate} to {data.dataWindow.endDate} ({data.dataWindow.tradingDays} trading days,
              source: {data.dataWindow.dataSource}).
            </p>
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <CardLabel>Equity curve (real, computed)</CardLabel>
            <div style={{ height: 280, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.equityCurve}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.marketGreen} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={colors.marketGreen} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: colors.textSecondary, fontSize: 11 }} minTickGap={40} />
                  <YAxis
                    tick={{ fill: colors.textSecondary, fontSize: 11 }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{ background: colors.surface, border: `1px solid ${colors.glassBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: colors.textSecondary }}
                    formatter={(v: unknown) => [Number(v).toFixed(4), "Equity (×initial)"]}
                  />
                  <Area type="monotone" dataKey="value" stroke={colors.marketGreen} fill="url(#equityGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatTile
              label="Total return"
              value={`${data.metrics.totalReturnPct >= 0 ? "+" : ""}${data.metrics.totalReturnPct.toFixed(2)}%`}
              tone={data.metrics.totalReturnPct >= 0 ? "positive" : "negative"}
            />
            <StatTile
              label="Annualized return"
              value={`${data.metrics.annualizedReturnPct >= 0 ? "+" : ""}${data.metrics.annualizedReturnPct.toFixed(2)}%`}
              tone={data.metrics.annualizedReturnPct >= 0 ? "positive" : "negative"}
            />
            <StatTile label="Max drawdown" value={`-${data.metrics.maxDrawdownPct.toFixed(2)}%`} tone="negative" />
            <StatTile label="Win rate" value={`${(data.metrics.winRate * 100).toFixed(1)}%`} />
            <StatTile label="Sharpe ratio" value={data.metrics.sharpeRatio.toFixed(2)} />
            <StatTile label="Trades" value={String(data.metrics.totalTrades)} />
          </div>

          <Card>
            <CardLabel>Symbols used</CardLabel>
            <p style={{ marginTop: 12, marginBottom: 8, color: colors.textSecondary, fontSize: 13 }}>
              {data.universe.included.length} of {data.universe.requested} requested symbols had sufficient real historical data
              and were included.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: data.universe.excluded.length ? 16 : 0 }}>
              {data.universe.included.map((s) => (
                <span
                  key={s.symbol}
                  style={{ padding: "4px 10px", borderRadius: 999, background: colors.page, fontSize: 12, color: colors.textPrimary }}
                >
                  {s.symbol}
                </span>
              ))}
            </div>
            {data.universe.excluded.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>Excluded (insufficient data):</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.7 }}>
                  {data.universe.excluded.map((s) => (
                    <li key={s.symbol}>
                      {s.symbol} — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
