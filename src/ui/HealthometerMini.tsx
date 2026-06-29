/**
 * HealthometerMini — compact circular health score ring
 *
 * Thin wrapper around ConfidenceMeter's SVG ring, tuned for inline use
 * in tables, cards, and lists.
 */

import { colors } from "../design/tokens";

interface HealthometerMiniProps {
  score: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const SIZES = {
  sm: { dim: 36, stroke: 4, fontSize: 10 },
  md: { dim: 48, stroke: 5, fontSize: 13 },
};

function healthColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 65) return "#00C9A7";
  if (score >= 45) return colors.primary;
  if (score >= 30) return "#FF9500";
  return colors.danger;
}

function healthLabel(score: number): string {
  if (score >= 80) return "Very Healthy";
  if (score >= 65) return "Healthy";
  if (score >= 45) return "Stable";
  if (score >= 30) return "Caution";
  return "Watch";
}

export function HealthometerMini({ score, size = "sm", showLabel = false }: HealthometerMiniProps) {
  const { dim, stroke, fontSize } = SIZES[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = healthColor(score);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: dim, height: dim, flexShrink: 0 }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          <circle
            cx={dim / 2} cy={dim / 2} r={radius}
            fill="none" stroke={colors.border} strokeWidth={stroke}
          />
          <circle
            cx={dim / 2} cy={dim / 2} r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 700,
              color: colors.textPrimary,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 500, color: color }}>
          {healthLabel(score)}
        </span>
      )}
    </div>
  );
}
