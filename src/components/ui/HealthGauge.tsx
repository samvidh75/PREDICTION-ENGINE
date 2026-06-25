import { getHealthColor, getHealthLabel, type HealthResult } from "../../lib/healthScore";

interface HealthGaugeProps {
  composite: HealthResult['composite'];
  score?: number | null;
  altmanZ?: number | null;
  piotroskiF?: number | null;

  size?: number;
}

export default function HealthGauge({
  composite,
  score,
  altmanZ,
  piotroskiF,
  size = 120,
}: HealthGaugeProps) {
  const color = getHealthColor(composite);
  const label = getHealthLabel(composite);
  const hasScore = score !== null && score !== undefined;
  const displayScore = hasScore ? score : 50;
  const strokeW = Math.max(6, Math.round(size * 0.08));
  const r = size / 2 - strokeW - 4;
  const circ = 2 * Math.PI * r;
  const fill = (displayScore / 100) * circ * 0.75; // 270deg arc
  const offset = circ * 0.125; // 45deg offset to start at bottom

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* Semicircular gauge */}
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`} style={{ flexShrink: 0, display: "block" }}>
        {/* Background arc */}
        <path
          d={describeArc(size / 2, size * 0.55, r, 135, 405)}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={describeArc(size / 2, size * 0.55, r, 135, 135 + (270 * displayScore / 100))}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease, stroke 0.3s ease" }}
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size * 0.48}
          textAnchor="middle"
          fontSize={size * 0.2}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          fill={composite ? color : "#9CA3AF"}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {score ?? "—"}
        </text>
      </svg>

      {/* Label */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          letterSpacing: "0.02em",
          textAlign: "center",
        }}
      >
        {label}
      </div>

      {/* Secondary metrics */}
      {(() => {
        const z = altmanZ ?? null;
        const f = piotroskiF ?? null;
        if (z === null && f === null) return null;
        return (
          <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 10, color: "var(--text-muted)" }}>
            {z !== null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 11 }}>{z.toFixed(2)}</div>
                <div style={{ fontSize: 9 }}>Z-Score</div>
              </div>
            )}
            {f !== null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 11 }}>{f}/9</div>
                <div style={{ fontSize: 9 }}>F-Score</div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
