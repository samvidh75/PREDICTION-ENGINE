// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — ResearchAiSurfaceTrigger
//
// Compact floating trigger (badge / inline) that opens a small popover with
// the AI context summary for any supported surface.  Designed as a lightweight
// alternative to the full ResearchAiExplanationPanel — ideal for inline use
// in page headers or next to search bars on scanner / compare / watchlist pages.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { Info, X } from "lucide-react";
import { colors, space } from "../design/tokens";
import type { ResearchAiContext } from "../components/ai-orchestrator/researchAiTypes";

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_CLOSED: import("react").CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 11px",
  borderRadius: "20px",
  border: `1px solid ${colors.hairline}`,
  background: "transparent",
  color: colors.textSecondary,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.15s, border-color 0.15s",
  whiteSpace: "nowrap",
};

const TRIGGER_OPEN: import("react").CSSProperties = {
  ...TRIGGER_CLOSED,
  background: colors.surfaceElevated,
  borderColor: colors.hairlineStrong,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function surfaceLabel(surface: string): string {
  switch (surface) {
    case "scanner":
      return "Scanner research context";
    case "compare":
      return "Compare research context";
    case "watchlist":
      return "Watchlist research context";
    case "alerts":
      return "Alert research context";
    case "stock":
      return "Stock research context";
    default:
      return "Research context";
  }
}

function getSurfaceItems(ctx: ResearchAiContext): string[] {
  switch (ctx.surface) {
    case "scanner":
      return ctx.scannerContext ?? [];
    case "compare":
      return ctx.comparisonContext ?? [];
    case "watchlist":
      return [
        ...(ctx.watchlistContext ?? []),
        ...(ctx.whatToWatch ?? []),
      ];
    case "alerts":
      return ctx.alertContext ?? [];
    default:
      return ctx.narrative ?? ctx.researchNarrative ?? [];
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ResearchAiSurfaceTriggerProps {
  /** The research context to display inside the popover (static, not AI-powered) */
  context: ResearchAiContext | null;
  /** Short badge label (default "Insight") */
  label?: string;
  /** Visual style (default "badge") */
  variant?: "badge" | "inline";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ResearchAiSurfaceTrigger({
  context,
  label = "Insight",
  variant = "badge",
}: ResearchAiSurfaceTriggerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = context ? getSurfaceItems(context) : [];

  /* Close on click outside */
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  if (!context) return null;

  const headTitle =
    context.companyName ?? context.symbol ?? surfaceLabel(context.surface);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: variant === "inline" ? "inline-flex" : "inline-block",
      }}
    >
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={surfaceLabel(context.surface)}
        aria-expanded={open}
        style={open ? TRIGGER_OPEN : TRIGGER_CLOSED}
      >
        <Info size={13} color={colors.accentRed} />
        {label}
      </button>

      {/* ── Popover ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: "240px",
            maxWidth: "340px",
            background: colors.surface,
            border: `1px solid ${colors.hairlineStrong}`,
            borderRadius: "12px",
            padding: space[3],
            zIndex: 100,
            display: "grid",
            gap: space[2],
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          {/* ── Header row ────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "grid", gap: "2px" }}>
              <span
                style={{
                  color: colors.textPrimary,
                  fontSize: "14px",
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {headTitle}
              </span>
              <span
                style={{
                  color: colors.textSecondary,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {surfaceLabel(context.surface)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                color: colors.ash,
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                borderRadius: "4px",
                lineHeight: 1,
                marginTop: "-2px",
                marginRight: "-4px",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Title ───────────────────────────────────────────────── */}
          {context.title ? (
            <p
              style={{
                margin: 0,
                color: colors.body,
                fontSize: "13px",
                lineHeight: 1.45,
              }}
            >
              {context.title}
            </p>
          ) : null}

          {/* ── Items list ──────────────────────────────────────────── */}
          {items.length > 0 ? (
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: "5px",
              }}
            >
              {items.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    color: colors.body,
                    fontSize: "12px",
                    lineHeight: 1.4,
                    paddingLeft: "14px",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "6px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: colors.ash,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {/* ── Sector / metadata footer ────────────────────────────── */}
          {context.sector ? (
            <div
              style={{
                color: colors.ash,
                fontSize: "11px",
                borderTop: `1px solid ${colors.hairline}`,
                paddingTop: space[2],
                marginTop: space[1],
              }}
            >
              Sector: {context.sector}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
