interface ScoreSemiCirclesProps {
  overallScore: number;
  riskScore: number;
}

function getColor(score: number): string {
  if (score >= 75) return "var(--green-text)";
  if (score >= 50) return "var(--amber-text)";
  return "var(--red-text)";
}

function strokeDasharray(score: number): string {
  const circumference = Math.PI * 100;
  const fillLength = (score / 100) * (circumference / 2);
  return `${fillLength} ${circumference}`;
}

export default function ScoreSemiCircles({ overallScore, riskScore }: ScoreSemiCirclesProps) {
  return (
    <svg width={200} height={120} viewBox="0 0 200 120" style={{ marginBottom: 20 }}>
      {/* Overall score — left semicircle */}
      <g>
        <circle
          cx={50} cy={100} r={50}
          fill="none"
          stroke="var(--border)"
          strokeWidth={8}
          strokeDasharray={`${Math.PI * 100} ${Math.PI * 100}`}
          strokeDashoffset={-Math.PI * 50}
          strokeLinecap="round"
        />
        <circle
          cx={50} cy={100} r={50}
          fill="none"
          stroke={getColor(overallScore)}
          strokeWidth={8}
          strokeDasharray={strokeDasharray(overallScore)}
          strokeDashoffset={-Math.PI * 50}
          strokeLinecap="round"
          opacity={0.8}
        />
        <text x={50} y={94} textAnchor="middle" fontSize={24} fontWeight={800} fill="var(--text-900)">
          {overallScore}
        </text>
        <text x={50} y={114} textAnchor="middle" fontSize={9} fill="var(--text-300)" fontWeight={600}>
          Health
        </text>
      </g>

      {/* Risk score — right semicircle */}
      <g>
        <circle
          cx={150} cy={100} r={50}
          fill="none"
          stroke="var(--border)"
          strokeWidth={8}
          strokeDasharray={`${Math.PI * 100} ${Math.PI * 100}`}
          strokeDashoffset={-Math.PI * 50}
          strokeLinecap="round"
        />
        <circle
          cx={150} cy={100} r={50}
          fill="none"
          stroke={getColor(riskScore)}
          strokeWidth={8}
          strokeDasharray={strokeDasharray(riskScore)}
          strokeDashoffset={-Math.PI * 50}
          strokeLinecap="round"
          opacity={0.8}
        />
        <text x={150} y={94} textAnchor="middle" fontSize={24} fontWeight={800} fill="var(--text-900)">
          {riskScore}
        </text>
        <text x={150} y={114} textAnchor="middle" fontSize={9} fill="var(--text-300)" fontWeight={600}>
          Risk
        </text>
      </g>
    </svg>
  );
}
