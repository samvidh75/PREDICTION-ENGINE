import { colors } from "../design/tokens";

/**
 * SuccessCheck — a small self-drawing checkmark, used for confirmation
 * moments (toasts, saved states). Same stroke-dashoffset draw-in technique
 * as HeroVisual's depth line — no external animation asset, exact accent
 * color, plays once on mount.
 */
export function SuccessCheck({ size = 20, color = colors.accentGreen }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12" cy="12" r="10"
        stroke={color}
        strokeWidth="1.6"
        strokeDasharray={63}
        strokeDashoffset={63}
        style={{ animation: "stockex-check-ring 480ms cubic-bezier(0.16,1,0.3,1) forwards" }}
      />
      <path
        d="M7 12.5l3 3 7-7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={14}
        strokeDashoffset={14}
        style={{ animation: "stockex-check-mark 260ms cubic-bezier(0.16,1,0.3,1) 380ms forwards" }}
      />
      <style>{`
        @keyframes stockex-check-ring { to { stroke-dashoffset: 0; } }
        @keyframes stockex-check-mark { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          svg * { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </svg>
  );
}
