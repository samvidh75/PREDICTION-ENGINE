export function scoreColor(s: number | null): string {
  if (!s) return "#e8e8e8";
  if (s >= 80) return "#0d5c34";
  if (s >= 65) return "#1a7f4b";
  if (s >= 50) return "#1a56db";
  if (s >= 35) return "#b45309";
  return "#c0392b";
}

export const getScoreColor = scoreColor;

export function scoreLabel(s: number | null): string {
  if (!s) return "—";
  if (s >= 90) return "Excellent";
  if (s >= 80) return "Very Good";
  if (s >= 70) return "Good";
  if (s >= 55) return "Fair";
  if (s >= 40) return "Weak";
  return "Poor";
}

export const getScoreLabel = scoreLabel;

export function scoreColorBg(s: number | null): string {
  if (!s) return "#f5f5f5";
  if (s >= 65) return "#ebf7f1";
  if (s >= 50) return "#eef4ff";
  if (s >= 35) return "#fff8e6";
  return "#fff1f0";
}

export function getSignalFromScore(s: number | null) {
  if (s === null) return { text: "—", color: "#bbb" };
  if (s >= 80) return { text: "Strong Buy ↗", color: "#1a7f4b" };
  if (s >= 65) return { text: "Buy ↗", color: "#1a7f4b" };
  if (s >= 50) return { text: "Accumulate →", color: "#1a56db" };
  if (s >= 35) return { text: "Watch ⚠", color: "#b45309" };
  return { text: "Avoid ↘", color: "#c0392b" };
}

interface ScoreRingProps {
  score: number | null;
  size: number;
  showLabel?: boolean;
}

export default function ScoreRing({ score, size, showLabel = false }: ScoreRingProps) {
  const strokeW = Math.max(6, size * 0.09);
  const r = size / 2 - strokeW / 2;
  const circ = 2 * Math.PI * r;
  const filled = score ? (score / 100) * circ : 0;
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const scoreFontSize = size * 0.27;
  const labelFontSize = size * 0.12;

  return (
    <div style={{ width: size, height: size + (showLabel ? labelFontSize + 6 : 0) }} className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={strokeW} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 + (showLabel ? -labelFontSize * 0.4 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={scoreFontSize}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          fill={score ? color : "#ccc"}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {score ?? "—"}
        </text>
        {showLabel && size >= 80 ? (
          <text
            x={size / 2}
            y={size / 2 + scoreFontSize * 0.55}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={labelFontSize}
            fontWeight="600"
            fontFamily="Inter, sans-serif"
            fill={score ? color : "#ccc"}
          >
            {label}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

export function ConfidenceRing({ pct, size = 28 }: { pct: number; size?: number }) {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e8e8" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1a7f4b"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function MiniSparkline({
  data,
  color = "#1a7f4b",
  width = 48,
  height = 20,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((value, index) => `${(index / (data.length - 1)) * width},${height - 2 - ((value - min) / range) * (height - 5)}`)
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
