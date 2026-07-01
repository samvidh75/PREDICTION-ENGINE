/**
 * TradingJournal — Premium user trading journal.
 *
 * Displays logged trades with performance statistics:
 *   - Win rate, total P&L, deployed capital, average return
 *   - Paginated trade history table with P&L per trade
 *   - Auto-fetches via authenticatedFetchJSON on mount
 *
 * Spec ref: Phase 46 — User Trading Ledger Dashboard.
 */

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, BarChart3, Target, RefreshCw } from "lucide-react";
import { colors, radius, typography, space } from "../design/tokens";
import { formatIndianMoney, formatPercent } from "../services/ui/indianNumberFormat";
import { authenticatedFetchJSON, authenticatedPost } from "../services/auth/authenticatedFetch";

// ── Type Contracts ──────────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  symbol: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  pnl_percentage: number | null;
  entry_date: string;
  exit_date: string | null;
  notes: string | null;
  created_at: string;
}

interface PerformanceStats {
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgReturnPct: number;
  deployedCapital: number;
}

interface TradeLogPayload {
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate?: string;
  exitDate?: string;
  notes?: string;
}

// ── Styles ──────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: colors.surface,
    borderRadius: radius.md,
    border: `1px solid ${colors.stone}`,
    padding: "24px",
    fontFamily: typography.fontFamily,
    color: colors.body,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  title: {
    fontSize: typography.headingMd.size,
    fontWeight: 600,
    color: colors.ink,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "24px",
  },
  statCard: {
    background: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: "14px 16px",
    border: `1px solid ${colors.stone}`,
  },
  statLabel: {
    fontSize: typography.bodySm.size,
    color: colors.mute,
    marginBottom: "4px",
  },
  statValue: {
    fontSize: typography.bodyMd.size,
    fontWeight: 600,
    color: colors.ink,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: typography.bodySm.size,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 8px",
    borderBottom: `1px solid ${colors.stone}`,
    color: colors.mute,
    fontWeight: 500,
  },
  td: {
    padding: "10px 8px",
    borderBottom: `1px solid ${colors.stone}`,
    color: colors.body,
  },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  refreshBtn: {
    background: "none",
    border: `1px solid ${colors.stone}`,
    borderRadius: radius.sm,
    padding: "8px 12px",
    color: colors.body,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: typography.bodySm.size,
  },
  empty: {
    textAlign: "center" as const,
    padding: "40px 20px",
    color: colors.mute,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

function formatPnl(value: number | null): string {
  if (value == null) return "—";
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatIndianMoney(value)}`;
}

function formatPnlClass(value: number | null): string | undefined {
  if (value == null) return undefined;
  return value > 0 ? "positive" : value < 0 ? "negative" : undefined;
}

// ── Component ───────────────────────────────────────────────────────

export function TradingJournal(): JSX.Element {
  const [trades, setTrades] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, ledgerRes] = await Promise.all([
        authenticatedFetchJSON<PerformanceStats>("/api/v1/ledger/performance"),
        authenticatedFetchJSON<{ trades: LedgerEntry[]; total: number }>("/api/v1/ledger?limit=50"),
      ]);
      setStats(perfRes);
      setTrades(ledgerRes.trades ?? []);
    } catch {
      // Signed-out or error — leave null state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Log a demo placeholder trade (dev convenience) ────────────────
  const handleLogSampleTrade = async () => {
    try {
      const payload: TradeLogPayload = {
        symbol: "RELIANCE",
        direction: "long",
        entryPrice: 2850,
        exitPrice: 2995,
        quantity: 10,
      };
      await authenticatedPost("/api/v1/ledger/log", payload);
      await fetchData();
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>Loading trading journal…</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.title}>
          <BarChart3 size={20} color={colors.mute} />
          Trading Journal
        </div>
        <button
          style={styles.refreshBtn}
          onClick={fetchData}
          title="Refresh"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ── Stats grid ───────────────────────────────────────── */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Win Rate</div>
            <div style={{ ...styles.statValue, color: stats.winRate >= 50 ? colors.success : colors.danger }}>
              {stats.winRate}%
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total P&L</div>
            <div style={{ ...styles.statValue, color: stats.totalPnl >= 0 ? colors.success : colors.danger }}>
              {formatPnl(stats.totalPnl)}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Trades</div>
            <div style={styles.statValue}>{stats.totalTrades}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Deployed Capital</div>
            <div style={styles.statValue}>{formatIndianMoney(stats.deployedCapital)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Avg Return</div>
            <div style={{ ...styles.statValue, color: stats.avgReturnPct >= 0 ? colors.success : colors.danger }}>
              {formatPercent(stats.avgReturnPct / 100)}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Wins / Losses</div>
            <div style={styles.statValue}>
              <span style={{ color: colors.success }}>{stats.winningTrades}</span>
              {" / "}
              <span style={{ color: colors.danger }}>{stats.losingTrades}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Trade table ──────────────────────────────────────── */}
      {trades.length === 0 ? (
        <div style={styles.empty}>
          <Target size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p>No trades logged yet.</p>
          <p style={{ fontSize: typography.bodySm.size, marginTop: "8px" }}>
            Trades will appear here once you log them via the API.
          </p>
          <button
            style={{
              ...styles.refreshBtn,
              margin: "16px auto 0",
              background: colors.surfaceElevated,
            }}
            onClick={handleLogSampleTrade}
          >
            <TrendingUp size={14} />
            Log sample trade
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Symbol</th>
                <th style={styles.th}>Dir</th>
                <th style={styles.th}>Entry</th>
                <th style={styles.th}>Exit</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>P&L</th>
                <th style={styles.th}>Return</th>
                <th style={styles.th}>Entry Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const pnlClass = formatPnlClass(trade.pnl);
                return (
                  <tr key={trade.id}>
                    <td style={{ ...styles.td, fontWeight: 500, color: colors.ink }}>
                      {trade.symbol}
                    </td>
                    <td style={styles.td}>
                      {trade.direction === "long" ? (
                        <TrendingUp size={14} color={colors.success} />
                      ) : (
                        <TrendingDown size={14} color={colors.danger} />
                      )}
                    </td>
                    <td style={styles.td}>{formatIndianMoney(trade.entry_price)}</td>
                    <td style={styles.td}>
                      {trade.exit_price != null ? formatIndianMoney(trade.exit_price) : "—"}
                    </td>
                    <td style={styles.td}>{trade.quantity}</td>
                    <td style={{ ...styles.td, ...(pnlClass ? styles[pnlClass] : {}) }}>
                      {formatPnl(trade.pnl)}
                    </td>
                    <td style={{ ...styles.td, ...(pnlClass ? styles[pnlClass] : {}) }}>
                      {trade.pnl_percentage != null ? formatPercent(trade.pnl_percentage / 100) : "—"}
                    </td>
                    <td style={{ ...styles.td, color: colors.mute }}>
                      {trade.entry_date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
