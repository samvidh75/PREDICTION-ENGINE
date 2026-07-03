import { colors, typography, radius } from "../design/tokens";

interface FrontierPoint {
  return_: number;
  volatility: number;
  sharpe: number;
  isMaxSharpe?: boolean;
  isMinVol?: boolean;
}

interface EfficientFrontierProps {
  points: FrontierPoint[];
  maxSharpe: FrontierPoint | null;
  minVol: FrontierPoint | null;
  width?: number;
  height?: number;
}

export function EfficientFrontierChart({
  points, maxSharpe, minVol, width = 600, height = 400,
}: EfficientFrontierProps) {
  if (points.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: colors.mute }}>
        Insufficient data for efficient frontier
      </div>
    );
  }

  const padding = { top: 40, right: 40, bottom: 50, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVol = Math.max(...points.map(p => p.volatility), 0.01);
  const minVolVal = Math.min(...points.map(p => p.volatility), 0);
  const maxRet = Math.max(...points.map(p => p.return_), 0.01);
  const minRet = Math.min(...points.map(p => p.return_), 0);

  const volRange = maxVol - minVolVal || 0.01;
  const retRange = maxRet - minRet || 0.01;

  const scaleX = (v: number) => padding.left + ((v - minVolVal) / volRange) * chartW;
  const scaleY = (r: number) => padding.top + chartH - ((r - minRet) / retRange) * chartH;

  const linePath = points.map((p, i) =>
    `${i === 0 ? "M" : "L"}${scaleX(p.volatility).toFixed(1)},${scaleY(p.return_).toFixed(1)}`
  ).join(" ");

  const maxSharpePoint = maxSharpe ? { x: scaleX(maxSharpe.volatility), y: scaleY(maxSharpe.return_) } : null;
  const minVolPoint = minVol ? { x: scaleX(minVol.volatility), y: scaleY(minVol.return_) } : null;

  return (
    <div style={{
      background: colors.surface,
      borderRadius: radius.xl,
      padding: "20px",
      border: `1px solid ${colors.hairline}`,
    }}>
      <div style={{ fontSize: typography.body.size, fontWeight: 600, color: colors.ink, marginBottom: "12px" }}>
        Efficient Frontier
      </div>

      <svg width={width} height={height} style={{ display: "block" }}>
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <line
              x1={padding.left} y1={padding.top + (chartH / 5) * i}
              x2={width - padding.right} y2={padding.top + (chartH / 5) * i}
              stroke={colors.hairline} strokeWidth={1}
            />
            <text
              x={padding.left - 8} y={padding.top + (chartH / 5) * i + 4}
              textAnchor="end" fill={colors.mute}
              fontSize="11"
            >
              {((maxRet - (retRange / 5) * i) * 100).toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Frontier line */}
        <path d={linePath} fill="none" stroke={colors.accentRed} strokeWidth={2} />

        {/* Frontier area fill */}
        <path
          d={`${linePath} L${scaleX(points[points.length - 1].volatility)},${height - padding.bottom} L${scaleX(points[0].volatility)},${height - padding.bottom} Z`}
          fill={colors.accentRedSoft}
        />

        {/* Max Sharpe point */}
        {maxSharpePoint && (
          <>
            <circle cx={maxSharpePoint.x} cy={maxSharpePoint.y} r={6} fill={colors.marketGreen} stroke={colors.canvas} strokeWidth={2} />
            <text x={maxSharpePoint.x + 8} y={maxSharpePoint.y + 4} fill={colors.ink} fontSize="11" fontWeight={600}>
              Max Sharpe ({maxSharpe?.sharpe.toFixed(2)})
            </text>
          </>
        )}

        {/* Min Vol point */}
        {minVolPoint && (
          <>
            <circle cx={minVolPoint.x} cy={minVolPoint.y} r={6} fill={colors.accentBlue} stroke={colors.canvas} strokeWidth={2} />
            <text x={minVolPoint.x + 8} y={minVolPoint.y + 16} fill={colors.ink} fontSize="11" fontWeight={600}>
              Min Vol
            </text>
          </>
        )}

        {/* Axis labels */}
        <text x={width / 2} y={height - 8} textAnchor="middle" fill={colors.mute} fontSize="12">
          Volatility (σ)
        </text>
        <text x={12} y={height / 2} textAnchor="middle" fill={colors.mute} fontSize="12" transform={`rotate(-90, 12, ${height / 2})`}>
          Expected Return
        </text>
      </svg>
    </div>
  );
}
