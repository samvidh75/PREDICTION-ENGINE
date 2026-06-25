import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number | null;
  size: number;
  showLabel?: boolean;
  animate?: boolean;
}

export function getScoreColor(s: number | null): string {
  if (!s) return "#E8E8E8";
  if (s >= 80) return "#0D5C34";
  if (s >= 65) return "#1a7f4b";
  if (s >= 50) return "#1A56DB";
  if (s >= 35) return "#B45309";
  return "#C0392B";
}

export const scoreColor = getScoreColor;

export function getScoreLabel(s: number | null): string {
  if (!s) return "—";
  if (s >= 90) return "High conviction";
  if (s >= 80) return "High conviction";
  if (s >= 65) return "Conviction";
  if (s >= 50) return "Neutral";
  if (s >= 35) return "Watch";
  return "Risk rising";
}

export const scoreLabel = getScoreLabel;

export function scoreColorBg(s: number | null): string {
  if (!s) return "#f5f5f5";
  if (s >= 65) return "#ebf7f1";
  if (s >= 50) return "#eef4ff";
  if (s >= 35) return "#fff8e6";
  return "#fff1f0";
}

export function getSignalFromScore(s: number | null) {
  if (s === null) return { text: "—", color: "#bbb" };
  if (s >= 80) return { text: "High conviction", color: "#1a7f4b" };
  if (s >= 65) return { text: "Conviction", color: "#1a7f4b" };
  if (s >= 50) return { text: "Neutral", color: "#1A56DB" };
  if (s >= 35) return { text: "Watch", color: "#B45309" };
  return { text: "Risk rising", color: "#C0392B" };
}

export default function ScoreRing({ score, size, showLabel = false, animate = true }: ScoreRingProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score);

  useEffect(() => {
    if (!animate || !score) {
      setDisplayed(score);
      return undefined;
    }
    setDisplayed(0);
    const t = window.setTimeout(() => setDisplayed(score), 100);
    return () => window.clearTimeout(t);
  }, [animate, score]);

  const strokeW = Math.max(6, Math.round(size * 0.09));
  const r = size / 2 - strokeW;
  const circ = 2 * Math.PI * r;
  const fill = ((displayed ?? 0) / 100) * circ;
  const color = getScoreColor(score);
  const scoreFontSize = Math.round(size * 0.265);
  const labelFontSize = Math.round(size * 0.115);
  const scoreY = showLabel ? size / 2 - labelFontSize * 0.6 : size / 2;
  const labelY = size / 2 + scoreFontSize * 0.42;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={strokeW} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: animate ? "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)" : "none" }}
      />
      <text
        x={size / 2}
        y={scoreY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={scoreFontSize}
        fontWeight="800"
        fontFamily="Inter, sans-serif"
        fill={score ? color : "#BBB"}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {score ?? "—"}
      </text>
      {showLabel && size >= 80 && score ? (
        <text
          x={size / 2}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={labelFontSize}
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          fill={color}
        >
          {getScoreLabel(score)}
        </text>
      ) : null}
    </svg>
  );
}

export function ConfidenceRing({ pct, size = 28 }: { pct: number; size?: number }) {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e8e8" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a7f4b" strokeWidth={3} strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

export function MiniSparkline({ data, color = "#1a7f4b", width = 48, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((value, index) => `${(index / (data.length - 1)) * width},${height - 2 - ((value - min) / range) * (height - 5)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
