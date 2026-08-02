/**
 * RelativeStrength — Price Momentum Ranking
 *
 * Ranks the PSEi-30 by REAL trailing price momentum computed from EODHD
 * daily OHLCV (api/relative-strength.ts). This replaced a placeholder that
 * disabled the page entirely because no fundamentals feed existed for PSE
 * tickers — that's still true (no free P/E/ROE/etc. feed), but EODHD does
 * provide real historical daily prices on its free tier, capped at ~1 year
 * of history. So this page is honest about scope: it's a price-momentum
 * ranking, not a full fundamentals-based relative-strength score, and it
 * never shows more than ~1 year of history.
 *
 * Lives at /relative-strength
 */

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { colors, typography } from "../design/tokens";

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface MomentumRow {
  symbol: string;
  name: string;
  asOf: string;
  lastClose: number;
  momentum1m: number | null;
  momentum3m: number | null;
  momentum6m: number | null;
  barsAvailable: number;
  dataUnavailable?: boolean;
}

interface RelativeStrengthResponse {
  ok: boolean;
  label: string;
  methodology: string;
  dataSourceCap: string;
  asOf: string | null;
  universe: string;
  count: number;
  unavailableSymbols: string[];
  rankings: MomentumRow[];
}

async function fetchRelativeStrength(): Promise<RelativeStrengthResponse> {
  const res = await fetch(`${API_BASE}/api/relative-strength`);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = await res.json();
  if (!data?.ok) throw new Error("bad_response");
  return data;
}

function formatPct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return "₱" + n.toFixed(2);
}

export default function RelativeStrengthPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["relative-strength"],
    queryFn: fetchRelativeStrength,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: colors.textPrimary, fontSize: typography.h2.desktop.size, fontWeight: 600, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingUp size={22} color={colors.accentBlue} />
          Price Momentum Ranking
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: 14.5, lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
          Ranked by real trailing price returns computed from EODHD daily prices for the PSEi-30 —
          this is price momentum only, not a fundamentals-based relative-strength score (no free P/E, ROE,
          or similar feed exists for PSE tickers). Historical depth is capped at approximately one year by
          the free EODHD data plan.
        </p>
      </div>

      {isLoading && (
        <Card>
          <p style={{ color: colors.textSecondary, fontSize: 14 }}>Loading real price momentum from EODHD…</p>
        </Card>
      )}

      {isError && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color={colors.accentRed} />
            <div>
              <p style={{ color: colors.textPrimary, fontSize: 14.5, fontWeight: 500, margin: "0 0 4px" }}>
                Data temporarily unavailable
              </p>
              <p style={{ color: colors.textSecondary, fontSize: 13, margin: 0 }}>
                The EODHD price feed didn&rsquo;t respond. This shows an error rather than stale or invented rankings.
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              marginTop: 16, padding: "8px 16px", borderRadius: 8, border: `1px solid ${colors.glassBorder}`,
              background: colors.surfaceElevated, color: colors.textPrimary, fontSize: 13, cursor: "pointer",
            }}
          >
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </Card>
      )}

      {data && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <Badge variant="info" value={data.universe} />
            {data.asOf && <Badge variant="neutral" label="As of" value={data.asOf} />}
            <Badge variant="neutral" value={`${data.count} of ${data.count + data.unavailableSymbols.length} ranked`} />
          </div>

          {data.unavailableSymbols.length > 0 && (
            <Card variant="command" style={{ marginBottom: 20, padding: "12px 16px" }}>
              <p style={{ color: colors.textSecondary, fontSize: 12.5, margin: 0 }}>
                No EODHD data available for: {data.unavailableSymbols.join(", ")} — excluded from ranking, not shown with fabricated values.
              </p>
            </Card>
          )}

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.glassBorder}` }}>
                    {["#", "Symbol", "Company", "Last Close", "1M", "3M", "6M"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === "Symbol" || h === "Company" ? "left" : "right",
                          padding: "12px 16px",
                          color: colors.mute,
                          fontSize: typography.captionSm.size,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rankings.map((row, i) => (
                    <tr key={row.symbol} style={{ borderBottom: `1px solid ${colors.glassBorder}` }}>
                      <td style={{ padding: "12px 16px", color: colors.mute, fontSize: 13 }}>{i + 1}</td>
                      <td style={{ padding: "12px 16px", color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{row.symbol}</td>
                      <td style={{ padding: "12px 16px", color: colors.textSecondary, fontSize: 13 }}>{row.name}</td>
                      <td style={{ padding: "12px 16px", color: colors.textPrimary, fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {formatPrice(row.lastClose)}
                      </td>
                      {[row.momentum1m, row.momentum3m, row.momentum6m].map((v, idx) => (
                        <td
                          key={idx}
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontSize: 13,
                            fontVariantNumeric: "tabular-nums",
                            color: v === null ? colors.mute : v >= 0 ? colors.accentGreen : colors.accentRed,
                          }}
                        >
                          {formatPct(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p style={{ color: colors.mute, fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
            {data.methodology} {data.dataSourceCap}
          </p>
        </>
      )}
    </div>
  );
}
