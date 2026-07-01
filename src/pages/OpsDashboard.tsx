/**
 * pages/OpsDashboard — Password-gated operations admin dashboard.
 *
 * Displays internal telemetry: LLM usage stats, subscription distribution,
 * pipeline run history, and system health.
 *
 * Access: /ops (enter password on first load)
 */

import { useState, useEffect, useCallback } from "react";
import { colors, typography, space, radius } from "../design/tokens";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TelemetryData {
  server: {
    uptime: number;
    node: string;
    env: string;
    memory: { heapUsed: number; heapTotal: number; rss: number };
  };
  llm: {
    last24h: { total_calls: number; avg_latency_ms: number; total_input_tokens: number; total_output_tokens: number };
    byService: Array<{ service: string; count: number }>;
  };
  subscriptions: {
    distribution: Array<{ status: string; count: number }>;
  };
  users: { total: number };
  pipelines: {
    summary: Array<{ status: string; count: number }>;
    recent: Array<{ phase: string; status: string; started_at: string; completed_at: string | null; symbols_attempted: number; symbols_succeeded: number }>;
  };
  billing: { total_transactions: number; total_revenue_paise: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function fmtBytes(bytes: number): string {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes > 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: space[8],
  },
  heading: {
    fontSize: typography.headingXl.size,
    fontWeight: typography.headingXl.weight,
    color: colors.ink,
    marginBottom: space[6],
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: space[4],
    marginBottom: space[8],
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.hairline}`,
    borderRadius: radius.md,
    padding: space[5],
  },
  cardTitle: {
    fontSize: typography.captionSm.size,
    fontWeight: 600,
    color: colors.mute,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: space[2],
  },
  cardValue: {
    fontSize: typography.headingMd.size,
    fontWeight: 500,
    color: colors.ink,
  },
  cardSub: {
    fontSize: typography.bodySm.size,
    color: colors.textSecondary,
    marginTop: space[1],
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: typography.bodySm.size,
  },
  th: {
    textAlign: "left" as const,
    padding: `${space[2]} ${space[3]}`,
    color: colors.mute,
    fontWeight: 600,
    fontSize: typography.captionSm.size,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderBottom: `1px solid ${colors.hairline}`,
  },
  td: {
    padding: `${space[2]} ${space[3]}`,
    color: colors.body,
    borderBottom: `1px solid ${colors.hairline}`,
  },
  badge: (status: string) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: radius.xs,
    fontSize: typography.captionSm.size,
    fontWeight: 500,
    background:
      status === "success" ? colors.marketGreenSoft :
      status === "failure" || status === "cancelled" ? colors.marketRedSoft :
      status === "partial" ? colors.marketOrangeSoft :
      status === "active" || status === "running" ? colors.accentBlueSoft :
      colors.backdropMuted,
    color:
      status === "success" ? colors.marketGreen :
      status === "failure" || status === "cancelled" ? colors.accentRed :
      status === "partial" ? colors.marketOrange :
      status === "active" || status === "running" ? colors.accentBlue :
      colors.mute,
  }),
  passwordOverlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  passwordCard: {
    background: colors.surface,
    border: `1px solid ${colors.hairline}`,
    borderRadius: radius.md,
    padding: space[8],
    textAlign: "center" as const,
    maxWidth: 400,
    width: "100%",
  },
  input: {
    width: "100%",
    padding: `${space[3]} ${space[4]}`,
    background: colors.surfaceElevated,
    border: `1px solid ${colors.hairline}`,
    borderRadius: radius.sm,
    color: colors.ink,
    fontSize: typography.bodyMd.size,
    outline: "none",
    boxSizing: "border-box" as const,
    marginTop: space[4],
    marginBottom: space[3],
  },
  button: {
    width: "100%",
    padding: `${space[3]} ${space[4]}`,
    background: colors.primary,
    color: colors.onPrimary,
    border: "none",
    borderRadius: radius.sm,
    fontSize: typography.buttonMd.size,
    fontWeight: typography.buttonMd.weight,
    cursor: "pointer",
  },
  error: {
    color: colors.accentRed,
    fontSize: typography.bodySm.size,
    marginTop: space[2],
  },
  sectionTitle: {
    fontSize: typography.headingSm.size,
    fontWeight: typography.headingSm.weight,
    color: colors.ink,
    marginBottom: space[4],
    marginTop: space[6],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpsDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<TelemetryData | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTelemetry = useCallback(async (pw: string) => {
    setLoading(true);
    setErr("");
    try {
      const base = "/api";
      const res = await fetch(`${base}/ops/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: TelemetryData = await res.json();
      setData(json);
      setAuthed(true);
    } catch (e: any) {
      setErr(e.message || "Failed to load telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 60 seconds when authed
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => fetchTelemetry(password), 60000);
    return () => clearInterval(interval);
  }, [authed, password, fetchTelemetry]);

  if (!authed) {
    return (
      <div style={styles.passwordOverlay}>
        <div style={styles.passwordCard}>
          <div style={{ fontSize: typography.headingMd.size, fontWeight: 500, color: colors.ink, marginBottom: space[2] }}>
            Ops Dashboard
          </div>
          <div style={{ fontSize: typography.bodySm.size, color: colors.textSecondary, marginBottom: space[4] }}>
            Enter the operations password to view internal telemetry.
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTelemetry(password);
            }}
          >
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoFocus
            />
            {err && <div style={styles.error}>{err}</div>}
            <button type="submit" style={styles.button} disabled={loading || !password}>
              {loading ? "Loading..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Ops Dashboard</h1>

      {/* ── Server Health ──────────────────────────────────── */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Uptime</div>
          <div style={styles.cardValue}>{fmtUptime(data.server.uptime)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Node</div>
          <div style={styles.cardValue}>{data.server.node}</div>
          <div style={styles.cardSub}>env: {data.server.env}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Heap Used</div>
          <div style={styles.cardValue}>{fmtBytes(data.server.memory.heapUsed)}</div>
          <div style={styles.cardSub}>of {fmtBytes(data.server.memory.heapTotal)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>RSS</div>
          <div style={styles.cardValue}>{fmtBytes(data.server.memory.rss)}</div>
        </div>
      </div>

      {/* ── LLM Usage ──────────────────────────────────────── */}
      <h2 style={styles.sectionTitle}>LLM Usage (last 24h)</h2>
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Calls</div>
          <div style={styles.cardValue}>{data.llm.last24h.total_calls.toLocaleString()}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Avg Latency</div>
          <div style={styles.cardValue}>{data.llm.last24h.avg_latency_ms} ms</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Input Tokens</div>
          <div style={styles.cardValue}>{data.llm.last24h.total_input_tokens.toLocaleString()}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Output Tokens</div>
          <div style={styles.cardValue}>{data.llm.last24h.total_output_tokens.toLocaleString()}</div>
        </div>
      </div>

      {/* ── LLM by service ─────────────────────────────────── */}
      {data.llm.byService.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>By Service</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Service</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.llm.byService.map((s) => (
                <tr key={s.service}>
                  <td style={styles.td}>{s.service}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Users & Subscriptions ──────────────────────────── */}
      <h2 style={styles.sectionTitle}>Users &amp; Billing</h2>
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Users</div>
          <div style={styles.cardValue}>{data.users.total.toLocaleString()}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Transactions (30d)</div>
          <div style={styles.cardValue}>{data.billing.total_transactions}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Revenue (30d)</div>
          <div style={styles.cardValue}>{fmtInr(data.billing.total_revenue_paise)}</div>
        </div>
      </div>

      {/* ── Subscription distribution ──────────────────────── */}
      {data.subscriptions.distribution.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Subscription Distribution</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.subscriptions.distribution.map((s) => (
                <tr key={s.status}>
                  <td style={styles.td}><span style={styles.badge(s.status)}>{s.status}</span></td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pipeline Runs ───────────────────────────────────── */}
      <h2 style={styles.sectionTitle}>Pipeline Runs (7 days)</h2>
      {data.pipelines.summary.length > 0 && (
        <div style={{ ...styles.card, marginBottom: space[4] }}>
          <div style={styles.cardTitle}>By Status</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.pipelines.summary.map((p) => (
                <tr key={p.status}>
                  <td style={styles.td}><span style={styles.badge(p.status)}>{p.status}</span></td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recent pipeline runs ────────────────────────────── */}
      {data.pipelines.recent.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Recent Runs</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Phase</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Started</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Symbols</th>
              </tr>
            </thead>
            <tbody>
              {data.pipelines.recent.map((r, i) => (
                <tr key={i}>
                  <td style={styles.td}>{r.phase}</td>
                  <td style={styles.td}><span style={styles.badge(r.status)}>{r.status}</span></td>
                  <td style={styles.td}>{new Date(r.started_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {r.symbols_succeeded}/{r.symbols_attempted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Auto-refresh note ──────────────────────────────── */}
      <div style={{ textAlign: "center", color: colors.mute, fontSize: typography.captionSm.size, marginTop: space[8], paddingBottom: space[8] }}>
        Auto-refreshes every 60 seconds
      </div>
    </div>
  );
}
