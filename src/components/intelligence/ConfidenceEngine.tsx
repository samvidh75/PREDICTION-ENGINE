import { colors, typography } from "../../design/tokens";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConfidenceMetrics {
  /** Overall confidence score 0-100 */
  score: number;
  /** Human-readable label */
  label: "High Confidence" | "Moderate Confidence" | "Low Confidence" | "Insufficient Data";
  /** Narrative describing data quality */
  narrative: string;
  /** Number of data points used */
  dataPoints: number;
  /** Score breakdown */
  breakdown: {
    fundamentals: number;   // 0-25: PE, ROE, etc. availability
    prices: number;         // 0-25: real-time + historical price data
    scores: number;         // 0-25: quality, valuation, growth, risk, momentum scores
    sentiment: number;      // 0-25: news, analyst coverage
  };
}

export interface ConfidenceEngineState {
  metrics: ConfidenceMetrics;
  isLoading: boolean;
  error: string | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useConfidenceEngine(
  overrides?: Partial<ConfidenceMetrics>
): ConfidenceEngineState {
  // Default: moderate confidence with balanced breakdown
  const defaults: ConfidenceMetrics = {
    score: 68,
    label: "Moderate Confidence",
    narrative: "Based on available fundamental and price data. AI analysis is indicative.",
    dataPoints: 8,
    breakdown: {
      fundamentals: 18,
      prices: 20,
      scores: 15,
      sentiment: 15,
    },
  };

  const metrics: ConfidenceMetrics = {
    ...defaults,
    ...overrides,
    score: Math.min(100, Math.max(0, overrides?.score ?? defaults.score)),
    label: computeLabel(overrides?.score ?? defaults.score),
    narrative: overrides?.narrative || generateNarrative(
      overrides?.score ?? defaults.score,
      overrides?.dataPoints ?? defaults.dataPoints
    ),
  };

  return { metrics, isLoading: false, error: null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeLabel(score: number): ConfidenceMetrics["label"] {
  if (score >= 75) return "High Confidence";
  if (score >= 40) return "Moderate Confidence";
  if (score > 0) return "Low Confidence";
  return "Insufficient Data";
}

function generateNarrative(score: number, dataPoints: number): string {
  const parts: string[] = [];
  if (dataPoints >= 10) parts.push("Based on comprehensive data across fundamentals, prices, and sentiment.");
  else if (dataPoints >= 5) parts.push("Based on multiple data sources including fundamentals and price history.");
  else parts.push("Limited data available. Analysis is directional.");
  if (score >= 75) parts.push("High conviction from strong data coverage.");
  else if (score < 40) parts.push("Verify independently before making investment decisions.");
  return parts.join(" ");
}

// ── Meter Component ──────────────────────────────────────────────────────────

interface ConfidenceMeterProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  breakdown?: ConfidenceMetrics["breakdown"];
  dataPoints?: number;
}

export function ConfidenceMeter({
  score,
  label,
  size = "md",
  showBreakdown = false,
  breakdown,
  dataPoints,
}: ConfidenceMeterProps) {
  const sizes = {
    sm: { dim: 64, stroke: 6, fontSize: 14 },
    md: { dim: 96, stroke: 8, fontSize: 20 },
    lg: { dim: 120, stroke: 10, fontSize: 26 },
  };
  const { dim, stroke, fontSize } = sizes[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? colors.success :
    score >= 40 ? colors.warning :
    colors.danger;

  const confidenceLabel = label || computeLabel(score);

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: size === "sm" ? 6 : 10 }}>
      <div style={{ position: "relative", width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          {/* Background circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={colors.border}
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
          />
        </svg>
        {/* Score text centered inside */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 700,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          {size !== "sm" && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: colors.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              /100
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: size === "sm" ? "12px" : "14px",
            fontWeight: 600,
            color: color,
            letterSpacing: "-0.01em",
          }}
        >
          {confidenceLabel}
        </div>
        {dataPoints !== undefined && (
          <div
            style={{
              fontSize: "11px",
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            {dataPoints} data point{dataPoints !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Optional breakdown bars */}
      {showBreakdown && breakdown && (
        <div style={{ width: "100%", marginTop: 8 }}>
          {([
            { key: "Fundamentals", value: breakdown.fundamentals, max: 25 },
            { key: "Prices", value: breakdown.prices, max: 25 },
            { key: "Scores", value: breakdown.scores, max: 25 },
            { key: "Sentiment", value: breakdown.sentiment, max: 25 },
          ] as const).map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
                fontSize: "11px",
                color: colors.textSecondary,
              }}
            >
              <span style={{ width: 80, textAlign: "right", flexShrink: 0 }}>{item.key}</span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  backgroundColor: colors.fill,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor:
                      item.value >= 20 ? colors.success :
                      item.value >= 10 ? colors.warning :
                      colors.danger,
                    borderRadius: 3,
                    transform: `scaleX(${item.value / item.max})`,
                    transformOrigin: "left center",
                    transition: "transform 0.4s ease",
                  }}
                />
              </div>
              <span style={{ width: 28, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                {item.value}/{item.max}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConfidenceMeter;
