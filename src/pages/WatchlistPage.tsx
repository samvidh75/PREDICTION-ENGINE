import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Bell, Clock, Crosshair, Eye, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Star, TrendingDown, TrendingUp, X } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ConvictionBadge } from "../ui/ConvictionBadge";
import { colors, typography, space, radius, media } from "../design/tokens";
import { AnalystBriefCard } from "../components/analyst/AnalystBriefCard";
import { ResearchAlertsPanel } from "../components/alerts/ResearchAlertsPanel";
import { ResearchAiExplanationPanel, buildAlertContext, buildWatchlistContext, buildWatchlistAiExplanationContext } from "../components/ai-orchestrator";
import type { ResearchAiContext } from "../components/ai-orchestrator";
import { ResearchAiSurfaceTrigger } from "../components/ResearchAiSurfaceTrigger";
import { ThesisChangeResearchPanel } from "../components/watchlist/ThesisChangeResearchPanel";
import { watchlistReviewBriefGenerator } from "../stockstory/analyst/watchlist/WatchlistReviewBriefGenerator";
import type { AlertChangeView, WatchlistThesisView } from "../research/contracts/productContracts";
import type { WatchlistIntelligence } from "../services/personalization/WatchlistIntelligenceEngine";
import { recordAction } from "../services/personalization/UserActionMemory";
import { getWatchlists, createWatchlist, addTickerToWatchlist, subscribeWatchlist } from "../services/portfolio/watchlistStore";
import { MetricsSkeleton } from "../components/SkeletonLoader";

const STATUS_COLORS: Record<string, string> = {
  Strengthening: colors.accentGreen,
  Stable: colors.accentBlue,
  "Needs review": colors.warning,
  Weakening: colors.danger,
  "Research signals pending": colors.textTertiary,
  "Tracking begins now": colors.textTertiary,
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
    <div className="raycast-slideUp" style={{ display: "grid", gap: "24px" }}>

      {/* Header row */}
      <div className="raycast-stagger-1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space[4] }}>
        <div>
          <h1 style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
            Watchlist
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: `${space[1]} 0 0` }}>
            Monitor your thesis and stay ahead of changes.
          </p>
        </div>
        <div style={{ display: "flex", gap: space[3], alignItems: "center" }}>
          {watchlistAiContext && (
            <ResearchAiSurfaceTrigger context={watchlistAiContext} variant="badge" label="AI Summary" />
          )}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
            <Button variant="secondary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} style={{ marginRight: "4px" }} />
              Add Stock
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
            <Button onClick={fetchIntelligence} disabled={loading}>
              {loading ? "Loading..." : "Refresh Intelligence"}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: colors.backdropModal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
          onClick={() => setShowAddModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAddModal(false)}
          role="presentation"
        >
          <Card style={{
            width: "100%",
            maxWidth: 420,
            display: "grid",
            gap: space[4],
            position: "relative",
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAddModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.textSecondary,
                padding: 4,
              }}
              aria-label="Close"
            >
              <X size={16} />
            </motion.button>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
              Add Stock to Track
            </h2>
            <div style={{ position: "relative" }}>
              <input
                ref={addInputRef}
                autoFocus
                placeholder="Search by symbol or company name…"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  padding: "0 12px 0 36px",
                  fontSize: 14,
                  color: colors.textPrimary,
                  background: `${colors.card} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") 12px center no-repeat`,
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
            </div>
            <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
              {WATCHLIST_TICKERS.filter((t) => t.includes(addQuery.toUpperCase())).slice(0, 6).map((t) => (
                <button
                  key={t}
                  onClick={() => { addTickerToWatchlist(getDefaultWatchlist().id, t); setShowAddModal(false); setAddQuery(""); }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                    background: colors.fill,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: colors.textSecondary, margin: 0 }}>
              Press <kbd style={{ padding: "1px 5px", borderRadius: 3, background: colors.fill, border: `1px solid ${colors.border}`, fontSize: 10 }}>Enter</kbd> to research a new symbol.
            </p>
          </Card>
        </div>
      )}

      {/* Summary chips */}
      {intel && (
        <div className="raycast-slideUp raycast-stagger-2" style={{ display: "flex", gap: space[3], flexWrap: "wrap" }}>
          {needsReviewCount > 0 && (
            <Badge variant="warning" value={`${needsReviewCount} need${needsReviewCount === 1 ? "s" : ""} review`} />
          )}
          {changedCount > 0 && (
            <Badge variant="info" value={`${changedCount} thesis change${changedCount === 1 ? "" : "s"}`} />
          )}
          {alertCount > 0 && (
            <Badge variant="warning" value={`${alertCount} research alert${alertCount === 1 ? "" : "s"}`} />
          )}
          <span style={{ fontSize: "12px", color: colors.textSecondary, display: "flex", alignItems: "center" }}>
            Updated {new Date(intel.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {intel && (
        <div className="raycast-slideUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <ThesisChangeResearchPanel
            items={thesisChangeItems}
            onResearch={handleResearch}
            onCompare={handleCompare}
            onTrack={handleTrack}
            onInvest={handleInvestReview}
          />
        </div>
      )}

      {intel && (
        <div className="raycast-slideUp" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <ResearchAlertsPanel
            alerts={intel.alerts}
            onResearch={handleResearch}
            onCompare={handleCompare}
            onTrack={handleTrack}
            onInvest={handleInvestReview}
          />
        </div>
      )}

      <div className="raycast-slideUp" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
        {watchlistAiContext && <ResearchAiExplanationPanel context={watchlistAiContext} />}
      </div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={pageTransition}
        >
          <Card>
            <div style={{ display: "grid", justifyItems: "center", gap: space[3], padding: `${space[4]} 0`, textAlign: "center" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: `${colors.warning}14`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertCircle size={22} color={colors.warning} />
              </div>
              <div style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>
                We couldn't load your watchlist
              </div>
              <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.5, margin: 0, maxWidth: 380 }}>
                {error}
              </p>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
                <Button variant="secondary" onClick={fetchIntelligence}>
                  <RefreshCw size={14} style={{ marginRight: "4px" }} />
                  Try again
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Loading skeleton — first fetch, before any intel has landed */}
      {loading && !intel && !error && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: space[4] }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div key={i} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} transition={pageTransition}>
              <MetricsSkeleton />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty / initial state */}
      {!intel && !loading && !error && (
        <Card className="raycast-slideUp" style={{ animationDelay: "0.2s", animationFillMode: "both", padding: space[8] }}>
          <div style={{ display: "grid", gap: space[5], justifyItems: "center", textAlign: "center", maxWidth: 440, margin: "0 auto" }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${colors.hairlineSoft} 0%, transparent 70%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Crosshair size={28} strokeWidth={1.5} color={colors.primary} />
            </div>
            <div style={{ display: "grid", gap: space[2] }}>
              <h2 style={{ color: colors.textPrimary, margin: 0, fontSize: 18, fontWeight: 700 }}>
                Start tracking your thesis
              </h2>
              <p style={{ color: colors.textSecondary, margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                Add stocks to your track list and we'll monitor their fundamentals, surface conviction changes,
                and tell you when it's time to review your thesis.
              </p>
            </div>
            <div style={{ display: "flex", gap: space[3], flexWrap: "wrap", justifyContent: "center" }}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
                <Button onClick={fetchIntelligence}>
                  <Star size={14} style={{ marginRight: "4px" }} />
                  Load Tracked Stocks
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
                <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                  <Plus size={14} style={{ marginRight: "4px" }} />
                  Add First Stock
                </Button>
              </motion.div>
            </div>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0,
              color: colors.textSecondary,
              borderTop: `1px solid ${colors.separator}`,
              paddingTop: space[4],
              width: "100%",
              borderRadius: 20,
              border: `1px solid ${colors.hairlineSoft}`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
              overflow: "hidden",
            }}>
              {[
                { icon: Sparkles, title: "Review updates", body: "See thesis changes as they land." },
                { icon: ShieldCheck, title: "Compare names", body: "Keep watchlist peers in one view." },
                { icon: Bell, title: "Stay alerted", body: "Know when conviction shifts." },
              ].map(({ icon: Icon, title, body }, index, items) => (
                <div
                  key={title}
                  style={{
                    display: "grid",
                    gap: space[2],
                    padding: `${space[4]} ${space[3]}`,
                    flex: "1 1 160px",
                    minHeight: 108,
                    borderRight: index === items.length - 1 ? "none" : `1px solid ${colors.hairlineSoft}`,
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    border: `1px solid ${colors.hairlineSoft}`,
                    background: "rgba(255,255,255,0.04)",
                    color: colors.textPrimary,
                  }}>
                    <Icon size={14} strokeWidth={1.8} />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <strong style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{title}</strong>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: colors.textSecondary }}>
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Intelligence grid */}
      {sorted.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: space[4],
        }}>
          {sorted.map((item, idx) => (
            <motion.div
              key={item.symbol}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pageTransition, delay: Math.min(idx, 12) * 0.04 }}
            >
            <Card>
              <div style={{ display: "grid", gap: space[3] }}>
                {/* Top row: symbol + conviction badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    onClick={() => handleResearch(item.symbol)}
                    onKeyDown={(e) => e.key === "Enter" && handleResearch(item.symbol)}
                    role="link"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, color: colors.textPrimary }}>
                      {item.symbol}
                    </div>
                    <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                      {item.companyName}
                    </div>
                  </div>
                  <ConvictionBadge
                    level={
                      item.currentStatus === "Strengthening" ? "healthy" :
                      item.currentStatus === "Stable" ? "stable" :
                      item.currentStatus === "Needs review" ? "caution" :
                      item.currentStatus === "Weakening" ? "caution" :
                      "watch-list"
                    }
                    size="md"
                  />
                </div>

                {/* Score bar */}
                {item.score !== null && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary }}>
                        {item.score}
                        <span style={{ fontSize: "13px", fontWeight: 400, color: colors.textSecondary }}>/100</span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: colors.textSecondary }}>
                        {item.scoreDirection === "improving" ? (
                          <><TrendingUp size={12} color={colors.marketGreen} /> Improving</>
                        ) : item.scoreDirection === "declining" ? (
                          <><TrendingDown size={12} color={colors.danger} /> Declining</>
                        ) : (
                          "Stable"
                        )}
                      </span>
                    </div>
                    <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${item.score}%`,
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${colors.success} 0%, ${colors.warning} 50%, ${colors.danger} 100%)`,
                      }} />
                    </div>
                  </div>
                )}

                {/* Thesis status + last reviewed */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: colors.textSecondary }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {item.lastUpdated
                      ? `Last reviewed ${new Date(item.lastUpdated).toLocaleDateString()}`
                      : "Not yet reviewed"}
                  </span>
                  {item.lastThesis && (
                    <span style={{ fontStyle: "italic" }}>
                      "{item.lastThesis.slice(0, 60)}{item.lastThesis.length > 60 ? "…" : ""}"
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
                    <Button variant="primary" onClick={() => handleResearch(item.symbol)}>
                      <Eye size={14} style={{ marginRight: "4px" }} />
                      Research
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
                    <Button variant="secondary" onClick={() => {
                      recordAction("watchlist_remove", item.symbol);
                    }}>
                      <Star size={14} style={{ marginRight: "4px", fill: colors.primary }} />
                      Unwatch
                    </Button>
                  </motion.div>
                </div>

                {/* Review brief */}
                {(() => {
                  const brief = watchlistReviewBriefGenerator.generate({
                    symbol: item.symbol,
                    thesisState: item.currentStatus,
                    riskRising: item.currentStatus === "Weakening" || item.currentStatus === "Needs review",
                    whatChanged: [],
                  });
                  return (
                    <div style={{ fontSize: "12px", color: colors.textSecondary, borderTop: `1px solid ${colors.border}`, paddingTop: space[2] }}>
                      <strong>Review brief:</strong> {brief.whatChangedSinceLastReview[0]}
                      {brief.risksRequiringAttention.length > 0 && (
                        <span> — {brief.risksRequiringAttention[0]}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </Card>
            </motion.div>
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
