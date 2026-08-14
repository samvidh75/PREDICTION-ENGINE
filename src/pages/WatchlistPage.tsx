import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Eye, Plus, RefreshCw, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { colors, typography, space, radius, media } from "../design/tokens";
import { ResearchAlertsPanel } from "../components/alerts/ResearchAlertsPanel";
import { ResearchAiExplanationPanel, buildWatchlistAiExplanationContext } from "../components/ai-orchestrator";
import type { ResearchAiContext } from "../components/ai-orchestrator";
import { ResearchAiSurfaceTrigger } from "../components/ResearchAiSurfaceTrigger";
import { ThesisChangeResearchPanel } from "../components/watchlist/ThesisChangeResearchPanel";
import type { WatchlistThesisView } from "../research/contracts/productContracts";
import type { WatchlistIntelligence } from "../services/personalization/WatchlistIntelligenceEngine";
import { recordAction } from "../services/personalization/UserActionMemory";
import { getWatchlists, createWatchlist, addTickerToWatchlist, subscribeWatchlist } from "../services/portfolio/watchlistStore";

const TERMINAL_COLORS = {
  cyan: "#B5502E",
  green: "#17754A",
  red: "#B3311F",
  bg: "#FAF8F4",
};

const STATUS_COLORS: Record<string, string> = {
  Strengthening: TERMINAL_COLORS.green,
  Stable: TERMINAL_COLORS.cyan,
  "Needs review": TERMINAL_COLORS.red,
  Weakening: TERMINAL_COLORS.red,
  "Research signals pending": "#64748B",
  "Tracking begins now": "#64748B",
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

function mergeThesisChangeItems(intel: WatchlistIntelligence | null): WatchlistThesisView[] {
  if (!intel) return [];
  const merged = [...(intel.needsReview ?? []), ...(intel.changedItems ?? [])];
  const seen = new Set<string>();

  return merged.filter((item) => {
    const key = item.symbol || `${item.companyName}-${item.currentStatus}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueCompact(values: Array<string | null | undefined>, max = 5): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= max) break;
  }
  return result;
}

function buildWatchlistAiExplanationContextLocal(
  intel: WatchlistIntelligence | null,
  thesisChangeItems: WatchlistThesisView[],
): ResearchAiContext | null {
  if (!intel) return null;
  return buildWatchlistAiExplanationContext({
    thesisItems: thesisChangeItems,
    alerts: intel.alerts ?? null,
  });
}

const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

const WATCHLIST_TICKERS = [
  "SM", "BDO", "AC", "ALI", "JFC",
  "ICT", "TEL", "GLO", "BPI", "URC",
];

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [intel, setIntel] = useState<WatchlistIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  /** The user's default (first) watchlist, creating one on first visit if none exists. */
  const getDefaultWatchlist = () => {
    const lists = getWatchlists();
    return lists[0] ?? createWatchlist("My Watchlist");
  };

  const fetchIntelligence = async () => {
    const tickers = getDefaultWatchlist().tickers;
    if (tickers.length === 0) {
      setIntel(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlist-intelligence?tickers=${encodeURIComponent(tickers.join(","))}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` },
      });
      if (!res.ok) throw new Error("Unable to load watchlist intelligence");
      const data = await res.json();
      setIntel(data);
    } catch {
      setError("Unable to load watchlist intelligence right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
    return subscribeWatchlist(fetchIntelligence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () => (intel ? sortWatchlist(intel.items) : []),
    [intel],
  );

  const thesisChangeItems = useMemo(
    () => mergeThesisChangeItems(intel),
    [intel],
  );

  const watchlistAiContext = useMemo(
    () => buildWatchlistAiExplanationContextLocal(intel, thesisChangeItems),
    [intel, thesisChangeItems],
  );

  const needsReviewCount = intel?.needsReview?.length ?? 0;
  const changedCount = intel?.changedItems?.length ?? 0;
  const alertCount = intel?.alerts?.length ?? 0;

  const handleResearch = (symbol: string) => {
    recordAction("thesis_check", symbol);
    navigate(`/stock/${symbol}`);
  };

  const handleCompare = (symbol: string) => {
    recordAction("compare_open", symbol);
    navigate(`/compare?symbols=${encodeURIComponent(symbol)}`);
  };

  const handleTrack = (symbol: string) => {
    recordAction("watchlist_review", symbol);
    navigate(`/stock/${symbol}`);
  };

  const handleInvestReview = (symbol: string) => {
    recordAction("invest_review", symbol);
    navigate(`/stock/${symbol}`);
  };

  return (
    <div style={{ display: "grid", gap: "12px", padding: "12px" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: TERMINAL_COLORS.cyan, fontSize: 16, fontWeight: 700, margin: 0, fontFamily: "monospace" }}>
            WATCHLIST
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {watchlistAiContext && (
            <ResearchAiSurfaceTrigger context={watchlistAiContext} variant="badge" label="AI Summary" />
          )}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: TERMINAL_COLORS.cyan,
              background: "transparent",
              border: `1px solid ${TERMINAL_COLORS.cyan}`,
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Plus size={12} />
            ADD
          </button>
          <button
            onClick={fetchIntelligence}
            disabled={loading}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: loading ? "#64748B" : TERMINAL_COLORS.green,
              background: "transparent",
              border: `1px solid ${loading ? "#64748B" : TERMINAL_COLORS.green}`,
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "monospace",
              opacity: loading ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RefreshCw size={12} />
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
          }}
          onClick={() => setShowAddModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAddModal(false)}
          role="presentation"
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: TERMINAL_COLORS.bg,
              border: `1px solid ${TERMINAL_COLORS.cyan}`,
              borderRadius: 4,
              padding: "12px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: TERMINAL_COLORS.cyan,
                padding: "2px",
              }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: TERMINAL_COLORS.cyan, margin: "0 0 10px 0", fontFamily: "monospace" }}>
              ADD STOCK
            </h2>
            <input
              ref={addInputRef}
              autoFocus
              placeholder="SYMBOL..."
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value.toUpperCase())}
              style={{
                width: "100%",
                height: 32,
                borderRadius: 3,
                border: `1px solid ${TERMINAL_COLORS.cyan}`,
                padding: "6px 8px",
                fontSize: 12,
                color: TERMINAL_COLORS.cyan,
                background: TERMINAL_COLORS.bg,
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && addQuery.trim()) {
                  addTickerToWatchlist(getDefaultWatchlist().id, addQuery.trim());
                  recordAction("watchlist_review", addQuery.trim().toUpperCase());
                  setShowAddModal(false);
                  setAddQuery("");
                }
              }}
            />
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
              {WATCHLIST_TICKERS.filter((t) => t.includes(addQuery)).slice(0, 6).map((t) => (
                <button
                  key={t}
                  onClick={() => { addTickerToWatchlist(getDefaultWatchlist().id, t); setShowAddModal(false); setAddQuery(""); }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 3,
                    border: `1px solid ${TERMINAL_COLORS.cyan}`,
                    background: "transparent",
                    fontSize: 11,
                    fontWeight: 600,
                    color: TERMINAL_COLORS.cyan,
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary row */}
      {intel && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: 11, fontFamily: "monospace" }}>
          {needsReviewCount > 0 && (
            <span style={{ color: TERMINAL_COLORS.red }}>
              {needsReviewCount} NEEDS REVIEW
            </span>
          )}
          {changedCount > 0 && (
            <span style={{ color: TERMINAL_COLORS.cyan }}>
              {changedCount} THESIS CHANGE{changedCount === 1 ? "" : "S"}
            </span>
          )}
          {alertCount > 0 && (
            <span style={{ color: TERMINAL_COLORS.red }}>
              {alertCount} ALERT{alertCount === 1 ? "" : "S"}
            </span>
          )}
          <span style={{ color: "#64748B" }}>
            {new Date(intel.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {intel && (
        <ThesisChangeResearchPanel
          items={thesisChangeItems}
          onResearch={handleResearch}
          onCompare={handleCompare}
          onTrack={handleTrack}
          onInvest={handleInvestReview}
        />
      )}

      {intel && (
        <ResearchAlertsPanel
          alerts={intel.alerts}
          onResearch={handleResearch}
          onCompare={handleCompare}
          onTrack={handleTrack}
          onInvest={handleInvestReview}
        />
      )}

      {watchlistAiContext && <ResearchAiExplanationPanel context={watchlistAiContext} />}

      {/* Error state */}
      {error && (
        <div style={{
          border: `1px solid ${TERMINAL_COLORS.red}`,
          borderRadius: 4,
          padding: "12px",
          background: TERMINAL_COLORS.bg,
        }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} color={TERMINAL_COLORS.red} />
              <span style={{ color: TERMINAL_COLORS.red, fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>
                ERROR
              </span>
            </div>
            <p style={{ color: "#94A3B8", fontSize: 11, margin: 0, fontFamily: "monospace" }}>
              {error}
            </p>
            <button
              onClick={fetchIntelligence}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                color: TERMINAL_COLORS.red,
                background: "transparent",
                border: `1px solid ${TERMINAL_COLORS.red}`,
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "monospace",
                width: "fit-content",
              }}
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !intel && !error && (
        <div style={{ borderTop: `1px solid #334155`, paddingTop: "8px", marginTop: "8px" }}>
          <div style={{ color: TERMINAL_COLORS.cyan, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
            {'>'} LOADING WATCHLIST DATA...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!intel && !loading && !error && (
        <div style={{
          border: `1px solid ${TERMINAL_COLORS.cyan}`,
          borderRadius: 4,
          padding: "16px",
          textAlign: "center",
          background: TERMINAL_COLORS.bg,
        }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <h2 style={{ color: TERMINAL_COLORS.cyan, margin: 0, fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>
              WATCHLIST EMPTY
            </h2>
            <p style={{ color: "#94A3B8", margin: 0, fontSize: 11, fontFamily: "monospace" }}>
              Add stocks to monitor fundamentals and track thesis changes.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
              <button
                onClick={fetchIntelligence}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: TERMINAL_COLORS.green,
                  background: "transparent",
                  border: `1px solid ${TERMINAL_COLORS.green}`,
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                LOAD
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: TERMINAL_COLORS.cyan,
                  background: "transparent",
                  border: `1px solid ${TERMINAL_COLORS.cyan}`,
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                ADD STOCK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      {sorted.length > 0 && (
        <div style={{ borderTop: `1px solid #334155`, marginTop: "8px", paddingTop: "8px" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 60px 80px 100px",
            gap: "8px",
            paddingBottom: "6px",
            borderBottom: `1px solid ${TERMINAL_COLORS.cyan}`,
            marginBottom: "4px",
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 600,
            color: TERMINAL_COLORS.cyan,
            textTransform: "uppercase",
          }}>
            <div>Symbol</div>
            <div>Status</div>
            <div>Score</div>
            <div>Trend</div>
            <div>Actions</div>
          </div>

          {/* Table rows */}
          <div style={{ display: "grid", gap: "2px" }}>
            {sorted.map((item) => (
              <div
                key={item.symbol}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 60px 80px 100px",
                  gap: "8px",
                  padding: "6px 0",
                  borderBottom: `1px solid #334155`,
                  alignItems: "center",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                {/* Symbol */}
                <div
                  onClick={() => handleResearch(item.symbol)}
                  style={{
                    cursor: "pointer",
                    color: TERMINAL_COLORS.cyan,
                    fontWeight: 600,
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                  }}
                >
                  {item.symbol}
                </div>

                {/* Status */}
                <div style={{
                  color: STATUS_COLORS[item.currentStatus] || "#64748B",
                  fontWeight: 500,
                }}>
                  {item.currentStatus}
                </div>

                {/* Score */}
                <div style={{
                  color: item.score && item.score > 70 ? TERMINAL_COLORS.green :
                          item.score && item.score > 40 ? TERMINAL_COLORS.cyan :
                          TERMINAL_COLORS.red,
                  textAlign: "right",
                  fontWeight: 600,
                }}>
                  {item.score !== null ? `${item.score}/100` : "—"}
                </div>

                {/* Trend */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  color: item.scoreDirection === "improving" ? TERMINAL_COLORS.green :
                          item.scoreDirection === "declining" ? TERMINAL_COLORS.red :
                          "#64748B",
                }}>
                  {item.scoreDirection === "improving" ? (
                    <TrendingUp size={10} />
                  ) : item.scoreDirection === "declining" ? (
                    <TrendingDown size={10} />
                  ) : (
                    "–"
                  )}
                  {item.scoreDirection === "improving" ? "UP" :
                   item.scoreDirection === "declining" ? "DOWN" : "FLAT"}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => handleResearch(item.symbol)}
                    style={{
                      padding: "3px 6px",
                      fontSize: 9,
                      fontWeight: 600,
                      color: TERMINAL_COLORS.cyan,
                      background: "transparent",
                      border: `1px solid ${TERMINAL_COLORS.cyan}`,
                      borderRadius: 2,
                      cursor: "pointer",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                    }}
                  >
                    <Eye size={10} style={{ display: "inline", marginRight: "2px" }} />
                    View
                  </button>
                  <button
                    onClick={() => recordAction("watchlist_remove", item.symbol)}
                    style={{
                      padding: "3px 6px",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#94A3B8",
                      background: "transparent",
                      border: "1px solid #94A3B8",
                      borderRadius: 2,
                      cursor: "pointer",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                    }}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
