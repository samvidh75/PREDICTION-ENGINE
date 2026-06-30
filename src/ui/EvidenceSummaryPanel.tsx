// ─────────────────────────────────────────────────────────────────────────────
// Phase 19E-5 — Evidence Summary Panel
//
// Renders deterministic evidence items (news, filings, corporate actions,
// earnings results, alerts) as a collapsible card with per-category sections.
// All data comes from real app sources — no fake data, no LLM calls.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown, ChevronRight, Newspaper, FileText, ArrowRightLeft, LineChart, Bell } from "lucide-react";
import { colors, space, typography, radius } from "../design/tokens";
import { Card, CardLabel } from "./Card";
import type { EventEvidencePack, EventEvidenceKind } from "../research/contracts/eventEvidenceContracts";
import type { EvidenceRetrievalAggregate } from "../research/contracts/evidenceRetrievalContracts";

/* ── Helpers ─────────────────────────────────────────────────────── */

const KIND_META: Record<EventEvidenceKind, { label: string; icon: React.ReactNode }> = {
  news_headline: { label: "News", icon: <Newspaper size={14} /> },
  filing_event: { label: "Filings", icon: <FileText size={14} /> },
  corporate_action: { label: "Corporate Actions", icon: <ArrowRightLeft size={14} /> },
  result_event: { label: "Results", icon: <LineChart size={14} /> },
  alert_event: { label: "Alerts", icon: <Bell size={14} /> },
  analyst_event: { label: "Analyst", icon: <FileText size={14} /> },
};

const IMPACT_COLORS: Record<string, string> = {
  positive: colors.success,
  negative: colors.marketRed,
  neutral: colors.textSecondary,
  mixed: colors.warning,
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr.slice(0, 10);
  }
}

/* ── Category Section ───────────────────────────────────────────── */

function EvidenceCategory({
  kind,
  items,
  defaultOpen,
}: {
  kind: EventEvidenceKind;
  items: { label: string; date: string; impact?: string; detail?: string }[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = KIND_META[kind] ?? { label: kind, icon: <FileText size={14} /> };
  const count = items.length;

  if (count === 0) return null;

  return (
    <div style={{ borderBottom: `1px solid ${colors.hairline}`, padding: `${space[2]} 0` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          all: "unset",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          cursor: "pointer",
          padding: "4px 0",
          color: colors.textPrimary,
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        {meta.icon}
        <span style={{ flex: 1 }}>{meta.label}</span>
        <span style={{ color: colors.textSecondary, fontWeight: 400, fontSize: "12px" }}>
          {count} item{count !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div style={{ display: "grid", gap: "4px", marginTop: "4px", paddingLeft: "22px" }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                padding: "4px 0",
                fontSize: "12px",
                lineHeight: "1.45",
              }}
            >
              <span style={{ color: colors.textPrimary }}>
                {item.label.slice(0, 120)}
                {item.detail && item.detail !== item.label ? (
                  <span style={{ color: colors.textTertiary, display: "block", fontSize: "11px" }}>
                    {item.detail.slice(0, 200)}
                  </span>
                ) : null}
              </span>
              <span
                style={{
                  color: IMPACT_COLORS[item.impact ?? "neutral"] ?? colors.textSecondary,
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                }}
              >
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────── */

interface EvidenceSummaryPanelProps {
  /** EventEvidencePack from buildEventEvidencePack() */
  pack?: EventEvidencePack | null;
  /** Or an EvidenceRetrievalAggregate from buildEvidenceRetrievalContext() */
  aggregate?: EvidenceRetrievalAggregate | null;
  /** Title override */
  title?: string;
}

export function EvidenceSummaryPanel({ pack, aggregate, title }: EvidenceSummaryPanelProps) {
  const [allOpen, setAllOpen] = useState(false);

  // If aggregate provided, render it directly (richer data)
  if (aggregate && aggregate.totalItems > 0) {
    return (
      <Card className="luxury-panel" style={{ display: "grid", gap: space[2], overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CardLabel>{title ?? "Evidence Summary"}</CardLabel>
          <button
            onClick={() => setAllOpen(!allOpen)}
            style={{
              all: "unset",
              cursor: "pointer",
              fontSize: "11px",
              color: colors.primary,
              marginLeft: "auto",
            }}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <div style={{ color: colors.textSecondary, fontSize: "12px", lineHeight: "1.5" }}>
          Retrieved {aggregate.totalItems} evidence items from deterministic sources.
        </div>

        <div>
          {aggregate.news.items.length > 0 && (
            <EvidenceCategory
              kind="news_headline"
              items={aggregate.news.items.map((i) => ({ label: i.title, date: i.publishedAt, impact: i.sentiment, detail: i.summary }))}
              defaultOpen={allOpen || aggregate.news.items.length <= 3}
            />
          )}
          {aggregate.filings.items.length > 0 && (
            <EvidenceCategory
              kind="filing_event"
              items={aggregate.filings.items.map((i) => ({ label: i.label, date: i.date, detail: i.detail }))}
              defaultOpen={allOpen}
            />
          )}
          {aggregate.corporateActions.items.length > 0 && (
            <EvidenceCategory
              kind="corporate_action"
              items={aggregate.corporateActions.items.map((i) => ({ label: i.label, date: i.date, impact: i.actionType === "dividend" ? "positive" : "neutral", detail: i.detail }))}
              defaultOpen={allOpen}
            />
          )}
          {aggregate.resultEvents.items.length > 0 && (
            <EvidenceCategory
              kind="result_event"
              items={aggregate.resultEvents.items.map((i) => ({
                label: `${i.period}: Rev ₹${(i.revenue ?? 0) / 1e7}Cr${i.revenueGrowthYoy != null ? ` (${i.revenueGrowthYoy >= 0 ? "+" : ""}${(i.revenueGrowthYoy * 100).toFixed(1)}%)` : ""}`,
                date: i.filingDate,
                detail: i.netProfit != null ? `Net Profit ₹${(i.netProfit ?? 0) / 1e7}Cr${i.profitGrowthYoy != null ? ` (${i.profitGrowthYoy >= 0 ? "+" : ""}${(i.profitGrowthYoy * 100).toFixed(1)}%)` : ""}` : undefined,
              }))}
              defaultOpen={allOpen}
            />
          )}
          {aggregate.alerts.items.length > 0 && (
            <EvidenceCategory
              kind="alert_event"
              items={aggregate.alerts.items.map((i) => ({ label: i.title, date: i.timestamp, detail: i.body }))}
              defaultOpen={allOpen}
            />
          )}
        </div>

        <div style={{ fontSize: "11px", color: colors.textTertiary }}>
          Data retrieved at {new Date(aggregate.retrievedAt).toLocaleTimeString("en-IN")}
        </div>
      </Card>
    );
  }

  // Fallback: render from EventEvidencePack
  if (!pack || pack.totalCount === 0) return null;

  const kindsWithItems = (Object.entries(pack.byKind) as unknown as [EventEvidenceKind, EventEvidencePack["items"]][])
    .filter(([, items]) => items.length > 0) as [EventEvidenceKind, EventEvidencePack["items"]][];

  if (kindsWithItems.length === 0) return null;

  return (
    <Card className="luxury-panel" style={{ display: "grid", gap: space[2], overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <CardLabel>{title ?? "Evidence Summary"}</CardLabel>
        <button
          onClick={() => setAllOpen(!allOpen)}
          style={{
            all: "unset",
            cursor: "pointer",
            fontSize: "11px",
            color: colors.primary,
            marginLeft: "auto",
          }}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div style={{ color: colors.textSecondary, fontSize: "12px", lineHeight: "1.5" }}>
        {pack.totalCount} evidence items across {kindsWithItems.length} source type{kindsWithItems.length > 1 ? "s" : ""}.
      </div>

      <div>
        {kindsWithItems.map(([kind, items]) => (
          <EvidenceCategory
            key={kind}
            kind={kind}
            items={items.map((i) => ({ label: i.label, date: i.date, impact: i.impact, detail: i.detail }))}
            defaultOpen={allOpen || (kind === "news_headline" && items.length <= 3)}
          />
        ))}
      </div>

      <div style={{ fontSize: "11px", color: colors.textTertiary }}>
        Retrieved at {new Date(pack.retrievedAt).toLocaleTimeString("en-IN")}
      </div>
    </Card>
  );
}
