import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Clock, Eye, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { colors, typography, space, radius } from "../design/tokens";
import { SEBIComplianceBanner } from "../components/SEBICompliance";
import type { WatchlistThesisView } from "../research/contracts/productContracts";
import type { WatchlistIntelligence } from "../services/personalization/WatchlistIntelligenceEngine";
import { recordAction } from "../services/personalization/UserActionMemory";

const STATUS_COLORS: Record<string, string> = {
  Strengthening: "#30D158",
  Stable: "#007AFF",
  "Needs review": "#FF9500",
  Weakening: "#FF3B30",
  "Research signals pending": "#8E8E93",
  "Tracking begins now": "#8E8E93",
};

const STATUS_PRIORITY: Record<string, number> = {
  Weakening: 0,
  "Needs review": 1,
  Strengthening: 2,
  Stable: 3,
  "Research signals pending": 4,
  "Tracking begins now": 5,
};

function sortWatchlist(items: WatchlistThesisView[]): WatchlistThesisView[] {
  return [...items].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.currentStatus] ?? 99;
    const pb = STATUS_PRIORITY[b.currentStatus] ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.score ?? 0) - (b.score ?? 0);
  });
}

const WATCHLIST_TICKERS = [
  "HDFCBANK", "TCS", "INFY", "RELIANCE", "ICICIBANK",
  "LT", "BHARTIARTL", "ITC", "SBIN", "AXISBANK",
];

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [intel, setIntel] = useState<WatchlistIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist-intelligence", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setIntel(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load watchlist intelligence");
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(
    () => (intel ? sortWatchlist(intel.items) : []),
    [intel],
  );

  const needsReviewCount = intel?.needsReview?.length ?? 0;
  const changedCount = intel?.changedItems?.length ?? 0;

  const handleResearch = (symbol: string) => {
    recordAction("thesis_check", symbol);
    navigate(`/stock/${symbol}`);
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <SEBIComplianceBanner />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space[4] }}>
        <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: 600, lineHeight: "1.25" }}>
          Watchlist
        </h1>
        <Button onClick={fetchIntelligence} disabled={loading}>
          {loading ? "Loading..." : "Refresh Intelligence"}
        </Button>
      </div>

      {/* Summary chips */}
      {intel && (
        <div style={{ display: "flex", gap: space[3], flexWrap: "wrap" }}>
          {needsReviewCount > 0 && (
            <Badge variant="warning" value={`${needsReviewCount} need${needsReviewCount === 1 ? "s" : ""} review`} />
          )}
          {changedCount > 0 && (
            <Badge variant="info" value={`${changedCount} thesis change${changedCount === 1 ? "" : "s"}`} />
          )}
          <span style={{ fontSize: "12px", color: colors.textSecondary, display: "flex", alignItems: "center" }}>
            Updated {new Date(intel.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card>
          <p style={{ color: "#FF3B30", margin: 0 }}>{error}</p>
          <Button variant="secondary" onClick={fetchIntelligence} style={{ marginTop: space[3] }}>
            Retry
          </Button>
        </Card>
      )}

      {/* Empty / initial state */}
      {!intel && !loading && !error && (
        <Card>
          <div style={{ display: "grid", gap: space[4], justifyItems: "center", textAlign: "center", padding: `${space[8]} 0` }}>
            <Star size={40} strokeWidth={1.5} color={colors.textSecondary} />
            <div>
              <h3 style={{ color: colors.textPrimary, margin: 0, fontSize: typography.h3.desktop.size }}>Your research watchlist</h3>
              <p style={{ color: colors.textSecondary, margin: `${space[2]} 0 0`, fontSize: typography.body.desktop.size }}>
                Click <strong>Refresh Intelligence</strong> to analyze your tracked companies with the latest research signals.
              </p>
            </div>
            <Button onClick={fetchIntelligence}>Refresh Intelligence</Button>
          </div>
        </Card>
      )}

      {/* Intelligence grid */}
      {sorted.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: space[4],
        }}>
          {sorted.map((item) => (
            <Card key={item.symbol}>
              <div style={{ display: "grid", gap: space[3] }}>
                {/* Top row: symbol + status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div
                      style={{
                        fontSize: typography.h3.desktop.size,
                        fontWeight: 600,
                        color: colors.textPrimary,
                        cursor: "pointer",
                      }}
                      onClick={() => handleResearch(item.symbol)}
                      onKeyDown={(e) => e.key === "Enter" && handleResearch(item.symbol)}
                      role="link"
                      tabIndex={0}
                    >
                      {item.symbol}
                    </div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary }}>
                      {item.companyName}
                    </div>
                  </div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: "24px",
                    padding: "0 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: STATUS_COLORS[item.currentStatus] || "#8E8E93",
                    color: "#fff",
                  }}>
                    {item.currentStatus}
                  </span>
                </div>

                {/* Score */}
                {item.score !== null && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: space[2] }}>
                    <span style={{ fontSize: "24px", fontWeight: 700, color: colors.textPrimary }}>
                      {item.score}
                    </span>
                    <span style={{ fontSize: "13px", color: colors.textSecondary }}>/ 100</span>
                  </div>
                )}

                {/* Conviction + trend */}
                <div style={{ display: "flex", gap: space[4], fontSize: "13px" }}>
                  <div>
                    <span style={{ color: colors.textSecondary }}>Conviction: </span>
                    <span style={{ fontWeight: 500 }}>{item.conviction}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: colors.textSecondary }}>Trend: </span>
                    {item.scoreDirection === "improving" ? (
                      <TrendingUp size={14} color="#30D158" />
                    ) : item.scoreDirection === "declining" ? (
                      <TrendingDown size={14} color="#FF3B30" />
                    ) : (
                      <span style={{ color: colors.textSecondary }}>—</span>
                    )}
                    <span style={{ fontWeight: 500 }}>{item.scoreDirection ?? "stable"}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
                  <Button variant="primary" onClick={() => handleResearch(item.symbol)}>
                    <Eye size={14} style={{ marginRight: "4px" }} />
                    Research
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    recordAction("watchlist_remove", item.symbol);
                  }}>
                    <Star size={14} style={{ marginRight: "4px", fill: colors.primary }} />
                    Unwatch
                  </Button>
                </div>

                {/* Thesis note */}
                {item.lastThesis && (
                  <div style={{
                    fontSize: "12px",
                    color: colors.textSecondary,
                    fontStyle: "italic",
                    borderTop: `1px solid ${colors.border}`,
                    paddingTop: space[2],
                  }}>
                    "{item.lastThesis.slice(0, 120)}{item.lastThesis.length > 120 ? "..." : ""}"
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 767px) {
          h1 { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}
