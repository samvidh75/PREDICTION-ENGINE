// src/components/market-brain/WhyDidThisMovePanel.tsx
// Phase 19A-6 — Standalone "Why Did This Move" panel.
//
// Renders a deterministic anomaly evidence pack as a self-contained card
// with optional browser-local LLM enhanced explanation. Independent from
// the full MarketBrainPanel — usable in stock pages, notifications, or
// any surface that has anomaly evidence.

import { useState, useCallback } from "react";
import { Brain, TrendingUp, AlertTriangle, Eye, X, Shield, Loader2 } from "lucide-react";
import type { MarketAnomalyEvidencePack } from "../../systems/market-brain/anomalyEvidencePack";
import { toAnomalyResearchAiContext } from "../ai-orchestrator/anomalyAiContext";
import { Card, CardLabel } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { colors, typography } from "../../design/tokens";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; fg: string }> = {
  Low:        { bg: "#1b5e20", fg: "#a5d6a7" },
  Medium:     { bg: "#e65100", fg: "#ffcc80" },
  High:       { bg: "#b71c1c", fg: "#ef9a9a" },
  "Needs review": { bg: "#37474f", fg: "#b0bec5" },
};

function SeverityPill({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] ?? { bg: "#37474f", fg: "#b0bec5" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        color: style.fg,
        background: style.bg,
        whiteSpace: "nowrap",
      }}
    >
      {severity}
    </span>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
      {children}
    </p>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface WhyDidThisMovePanelProps {
  /** The anomaly evidence pack (deterministic, research-only) */
  pack: MarketAnomalyEvidencePack | null | undefined;
  /** Optional callback to generate an AI-enhanced explanation */
  onEnhance?: (context: string) => void;
  /** True when an enhanced explanation is being generated */
  enhancing?: boolean;
  /** Enhanced explanation text (shown when available) */
  enhancedExplanation?: string | null;
  /** Callback to dismiss the enhanced explanation */
  onDismissEnhance?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WhyDidThisMovePanel({
  pack,
  onEnhance,
  enhancing = false,
  enhancedExplanation = null,
  onDismissEnhance,
}: WhyDidThisMovePanelProps) {
  const [showEnhanced, setShowEnhanced] = useState(false);

  // Convert to research context once
  const ctx = toAnomalyResearchAiContext(pack);
  const show = ctx !== null;

  const handleEnhance = useCallback(() => {
    const contextStr = [
      ctx?.headline,
      ctx?.researchNarrative?.join(". "),
      ctx?.evidenceToReview?.join("; "),
      ctx?.risksToReview?.join("; "),
    ]
      .filter(Boolean)
      .join("\n");
    if (contextStr && onEnhance) {
      setShowEnhanced(true);
      onEnhance(contextStr);
    }
  }, [ctx, onEnhance]);

  const handleDismiss = useCallback(() => {
    setShowEnhanced(false);
    onDismissEnhance?.();
  }, [onDismissEnhance]);

  if (!show || !pack) return null;

  const evidenceItems = ctx!.evidenceToReview ?? pack.evidence;
  const riskItems = ctx!.risksToReview;
  const watchItems = ctx!.whatToWatch;

  return (
    <Card className="why-did-this-move-panel" variant="elevated">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <TrendingUp size={16} color={colors.primary} />
          <CardLabel>Why Did This Move</CardLabel>
        </div>
        <SeverityPill severity={pack.severity} />
      </div>

      {/* ── Anomaly type ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
          {pack.anomalyType}
        </span>
        <span style={{ fontSize: "12px", color: colors.textSecondary }}>
          {pack.timeframe} · {pack.symbol}
        </span>
      </div>

      {/* ── Headline ─────────────────────────────────────────────────── */}
      {ctx!.headline && (
        <p
          style={{
            fontSize: "13px",
            color: colors.textSecondary,
            lineHeight: 1.5,
            margin: "0 0 12px",
          }}
        >
          {ctx!.headline}
        </p>
      )}

      {/* ── Evidence ─────────────────────────────────────────────────── */}
      {evidenceItems.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <SectionTitle>Evidence</SectionTitle>
          <ul
            style={{
              margin: "4px 0 0",
              paddingLeft: "16px",
              fontSize: "13px",
              color: colors.textSecondary,
              lineHeight: 1.6,
            }}
          >
            {evidenceItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Risks ────────────────────────────────────────────────────── */}
      {riskItems && riskItems.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <SectionTitle>Risks to Review</SectionTitle>
          <ul
            style={{
              margin: "4px 0 0",
              paddingLeft: "16px",
              fontSize: "13px",
              color: colors.danger,
              lineHeight: 1.6,
            }}
          >
            {riskItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── What to Watch ────────────────────────────────────────────── */}
      {watchItems && watchItems.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <SectionTitle>What to Watch</SectionTitle>
          <ul
            style={{
              margin: "4px 0 0",
              paddingLeft: "16px",
              fontSize: "13px",
              color: colors.textSecondary,
              lineHeight: 1.6,
            }}
          >
            {watchItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Enhance button ──────────────────────────────────────────── */}
      {onEnhance && !showEnhanced && (
        <button
          type="button"
          onClick={handleEnhance}
          disabled={enhancing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "8px",
            border: `1px solid ${colors.hairline}`,
            background: "transparent",
            color: colors.textSecondary,
            fontSize: "12px",
            cursor: enhancing ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 0.15s",
            opacity: enhancing ? 0.5 : 1,
          }}
        >
          {enhancing ? (
            <Loader2 size={14} className="raycast-spinner" />
          ) : (
            <Brain size={14} />
          )}
          {enhancing ? "Enhancing…" : "Enhance explanation"}
        </button>
      )}

      {/* ── Enhanced result ──────────────────────────────────────────── */}
      {showEnhanced && enhancedExplanation && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            background: colors.fill,
            borderRadius: "8px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                color: colors.textSecondary,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Brain size={12} />
              Enhanced
            </span>
            {onDismissEnhance && (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss"
                style={{
                  background: "none",
                  border: "none",
                  color: colors.ash,
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  lineHeight: 1,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p
            style={{
              fontSize: "13px",
              color: colors.textPrimary,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {enhancedExplanation}
          </p>
        </div>
      )}

      {/* ── Method note ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "flex-start",
          marginTop: "12px",
          padding: "8px",
          background: colors.fill,
          borderRadius: "8px",
        }}
      >
        <Shield size={12} color={colors.textSecondary} style={{ marginTop: "2px", flexShrink: 0 }} />
        <p
          style={{
            fontSize: "11px",
            color: colors.textSecondary,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Deterministic research analysis based on available price, volume, and sector data.
          {pack.anomalyType} flagged at {pack.severity} severity.
        </p>
      </div>
    </Card>
  );
}
