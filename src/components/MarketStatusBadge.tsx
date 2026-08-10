import { useMarketStatus, type MarketStatusState } from "../hooks/useMarketStatus";
import { colors, typography, radius } from "../design/tokens";

/**
 * MarketStatusBadge — compact live PSE session indicator.
 *
 * A pulsing status dot + short label ("Market open", "Lunch break", …) that
 * sits in mastheads/heroes and reads at a glance. Color intent follows the
 * existing semantic palette: live green for open, accent red-orange for
 * auction/closing, neutral gray for closed.
 */

const SESSION_COLORS: Record<MarketStatusState["session"], string> = {
  open: colors.marketGreen,
  auction: colors.accentRed,
  lunch: colors.accentYellow,
  closing: colors.accentRed,
  "post-market": colors.ash,
  weekend: colors.ash,
  "pre-market": colors.ash,
  holiday: colors.ash,
};

export function MarketStatusBadge({
  status,
  showDetail = false,
  size = "md",
}: {
  status?: MarketStatusState;
  showDetail?: boolean;
  size?: "sm" | "md";
}) {
  const live = useMarketStatus();
  const state = status ?? live;
  const sessionColor = SESSION_COLORS[state.session];
  const compact = size === "sm";

  return (
    <span
      className="stockex-status-dot"
      role="status"
      title={state.detail}
      aria-label={`PSE: ${state.label} — ${state.detail}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: compact ? "3px 9px" : "5px 11px",
        background: colors.surface,
        border: `1px solid ${colors.glassBorder}`,
        borderRadius: radius.full,
        fontFamily: typography.fontFamily,
        fontSize: compact ? typography.captionSm.size : typography.captionMd.size,
        fontWeight: 600,
        color: sessionColor,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        className={state.isOpen ? "stockex-status-pulse" : undefined}
        style={{
          width: compact ? 6 : 7,
          height: compact ? 6 : 7,
          borderRadius: "50%",
          background: sessionColor,
          boxShadow: `0 0 0 3px ${state.isOpen ? "rgba(52,199,89,0.18)" : "transparent"}`,
          flexShrink: 0,
        }}
      />
      <span>{state.label}</span>
      {showDetail && (
        <span
          style={{
            color: colors.mute,
            fontWeight: 400,
            fontSize: compact ? typography.captionSm.size : typography.captionMd.size,
          }}
        >
          · {state.detail}
        </span>
      )}
      <style>{`
        .stockex-status-pulse { animation: stockex-status-pulse 2s ease-in-out infinite; }
        @keyframes stockex-status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .stockex-status-pulse { animation: none; }
        }
      `}</style>
    </span>
  );
}
