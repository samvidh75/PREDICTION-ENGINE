import React from "react";

type Size = "sm" | "md" | "lg" | "xl";

interface ScoreRingProps {
  score: number | null;
  size?: Size;
  showGrade?: boolean;
}

const SIZE_PX: Record<Size, number> = { sm: 40, md: 64, lg: 96, xl: 128 };
const STROKE: Record<Size, number> = { sm: 4, md: 6, lg: 8, xl: 10 };
const FONT: Record<Size, number> = { sm: 10, md: 13, lg: 18, xl: 24 };
const GRADE_FONT: Record<Size, number> = { sm: 6, md: 8, lg: 11, xl: 14 };

function scoreColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v >= 70) return "#16A34A";
  if (v >= 55) return "#22C55E";
  if (v >= 40) return "#F59E0B";
  if (v >= 25) return "#FB923C";
  return "#EF4444";
}

function scoreGrade(v: number | null): string {
  if (v === null) return "—";
  if (v >= 85) return "A+";
  if (v >= 70) return "A";
  if (v >= 60) return "B+";
  if (v >= 50) return "B";
  if (v >= 35) return "C+";
  return "C";
}

export function ScoreRing({ score, size = "md", showGrade = false }: ScoreRingProps) {
  const px = SIZE_PX[size];
  const sw = STROKE[size];
  const r = (px - sw) / 2;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  const label = score !== null ? Math.round(score).toString() : "—";
  const grade = scoreGrade(score);
  const cy = showGrade ? px / 2 - GRADE_FONT[size] / 2 : px / 2;

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      role="img"
      aria-label={score !== null ? `Score: ${Math.round(score)} (${grade})` : "Score unavailable"}
    >
      <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={sw} />
      <circle
        cx={px / 2} cy={px / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round" transform={`rotate(-90 ${px / 2} ${px / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y={cy} textAnchor="middle" dy="0.35em" fontSize={FONT[size]} fontWeight="700" fill={color}>
        {label}
      </text>
      {showGrade && score !== null && (
        <text x="50%" y={cy + FONT[size] * 0.8} textAnchor="middle" fontSize={GRADE_FONT[size]} fill={color} opacity={0.7}>
          {grade}
        </text>
      )}
    </svg>
  );
}

export default ScoreRing;
