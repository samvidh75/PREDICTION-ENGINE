import type { UnifiedFactorScore } from "../../prediction-engine/types";

const scoreTone = (score: number | null) =>
  score === null
    ? ["var(--ink4)", "var(--line-light)"]
    : score >= 75
      ? ["var(--green)", "var(--green-bg)"]
      : score >= 55
        ? ["var(--blue)", "var(--blue-bg)"]
        : score >= 35
          ? ["var(--amber)", "var(--amber-bg)"]
          : ["var(--red)", "var(--red-bg)"];
export const scoreLabel = (score: number | null) =>
  score === null
    ? "Unavailable"
    : score >= 85
      ? "Excellent"
      : score >= 70
        ? "Very Good"
        : score >= 55
          ? "Fair"
          : score >= 35
            ? "Weak"
            : "Poor";
export function ScoreRing({
  score,
  size,
  strokeWidth = 8,
}: {
  score: number | null;
  size: number;
  strokeWidth?: number;
}) {
  const [color] = scoreTone(score);
  const r = (size - strokeWidth) / 2,
    c = 2 * Math.PI * r,
    p = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ebebeb"
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong style={{ fontSize: size * 0.27, color }}>
        {score === null ? "—" : Math.round(score)}
      </strong>
      <small style={{ fontSize: Math.max(9, size * 0.1), color }}>
        {scoreLabel(score)}
      </small>
    </div>
  );
}
export function ScoreBadge({
  score,
  label,
}: {
  score: number | null;
  label: string;
}) {
  const [color, bg] = scoreTone(score);
  return (
    <div className="score-badge" style={{ color, background: bg }}>
      <b>{score === null ? "—" : Math.round(score)}</b>
      <small>{label}</small>
    </div>
  );
}
export function MiniSparkline({
  data,
  color = "var(--green)",
  width = 60,
  height = 26,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return <span className="muted">—</span>;
  const min = Math.min(...data),
    max = Math.max(...data),
    range = max - min || 1;
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 5)}`,
    )
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function FactorDots({
  factorScores,
}: {
  factorScores: UnifiedFactorScore[];
}) {
  return (
    <div className="factor-dots">
      {["quality", "growth", "valuation", "momentum", "risk"].map((group) => {
        const f = factorScores.find((x) => x.group === group),
          v = f?.value ?? null,
          [color, bg] = scoreTone(v);
        return (
          <span
            key={group}
            title={`${group[0].toUpperCase() + group.slice(1)}: ${v === null ? "—" : Math.round(v)}`}
            style={{ color, background: bg }}
          >
            {group[0].toUpperCase()}
            <b>{v === null ? "—" : Math.round(v)}</b>
          </span>
        );
      })}
    </div>
  );
}
export function AISignalBadge({ classification }: { classification: string }) {
  const map: Record<string, [string, string]> = {
    EXCELLENT: ["High Conviction", "var(--green)"],
    HEALTHY: ["Research", "var(--green)"],
    STABLE: ["Watch", "var(--blue)"],
    WEAKENING: ["Needs Review", "var(--amber)"],
    AT_RISK: ["Risk Rising", "var(--red)"],
  };
  const [label, color] = map[classification] ?? ["Research", "var(--ink4)"];
  return (
    <span className="signal" style={{ color }}>
      {label}
    </span>
  );
}
export function ConfidenceRing({ confidence }: { confidence: number }) {
  const p = Math.max(0, Math.min(100, confidence));
  return (
    <div
      className="confidence"
      style={{ background: `conic-gradient(var(--green) ${p}%,#e9e9e9 0)` }}
    >
      <i>{Math.round(p)}%</i>
    </div>
  );
}
export function Card({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
