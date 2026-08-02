// ─────────────────────────────────────────────────────────────────────────────
// Phase 19C-8 — EnhancedExplanationAction
//
// Shared UI affordance that surfaces event-grounded LLM context for any page
// that has event evidence.  Shows a small "Why this moved" or "What changed"
// button that opens the ResearchAiSurfaceTrigger popover with enriched context.
//
// Wires into: StockPage, WatchlistPage, ScannerPage, ComparePage, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { colors, space } from "../design/tokens";
import type { ResearchAiContext } from "./ai-orchestrator/researchAiTypes";
import { surfaceLabel, getSurfaceItems } from "./ResearchAiSurfaceTrigger";

// ─── Styles ──────────────────────────────────────────────────────────────────

const BUTTON_STYLE: import("react").CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 14px",
  borderRadius: "8px",
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  color: colors.textSecondary,
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
  whiteSpace: "nowrap",
};

const BUTTON_HOVER: import("react").CSSProperties = {
  ...BUTTON_STYLE,
  background: colors.surfaceElevated,
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  borderColor: colors.hairlineStrong,
  color: colors.textPrimary,
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface EnhancedExplanationActionProps {
  /** The enriched research context with event evidence */
  context: ResearchAiContext | null;
  /** Optional label (default "What changed") */
  label?: string;
  /** Optional size variant */
  size?: "sm" | "md";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EnhancedExplanationAction({
  context,
  label = "What changed",
  size = "md",
}: EnhancedExplanationActionProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sizeStyle: import("react").CSSProperties =
    size === "sm"
      ? { padding: "4px 10px", fontSize: "12px" }
      : {};

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

  const currentStyle = hovered ? { ...BUTTON_HOVER, ...sizeStyle } : { ...BUTTON_STYLE, ...sizeStyle };
  const items = getSurfaceItems(context);
  const title = context.companyName ?? context.symbol ?? surfaceLabel(context.surface);

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* ── Action button ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={label}
        aria-expanded={open}
        style={currentStyle}
      >
        <Sparkles size={14} color={colors.accentRed} />
        {label}
      </button>

      {/* ── Popover ─────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: "260px",
            maxWidth: "360px",
            background: colors.surface,
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: `1px solid ${colors.hairlineStrong}`,
            borderRadius: "12px",
            padding: space[3],
            zIndex: 100,
            display: "grid",
            gap: space[2],
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          {/* ── Header ──────────────────────────────────────────── */}
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
                {title}
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

          {/* ── Context items ────────────────────────────────────── */}
          {items.length > 0 && (
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
          )}

          {/* ── Event evidence footer ──────────────────────────── */}
          {(context.whatChanged?.length ?? 0) > 0 && (
            <div
              style={{
                color: colors.ash,
                fontSize: "11px",
                borderTop: `1px solid ${colors.hairline}`,
                paddingTop: space[2],
                marginTop: space[1],
              }}
            >
              <strong>What changed:</strong>{" "}
              {context.whatChanged!.slice(0, 2).join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
