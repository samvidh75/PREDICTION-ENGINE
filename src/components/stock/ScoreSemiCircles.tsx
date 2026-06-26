interface ScoreSemiCirclesProps {
  overallScore: number;
  riskScore: number;
}

function getColor(score: number): string {
  if (score >= 75) return "#2DD4BF";
  if (score >= 50) return "#FFA502";
  return "#FF4757";
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
          stroke="rgba(255,255,255,0.1)"
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
        <text x={50} y={94} textAnchor="middle" fontSize={24} fontWeight={800} fill="white">
          {overallScore}
        </text>
        <text x={50} y={114} textAnchor="middle" fontSize={9} fill="#6E6E6E" fontWeight={600}>
          Health
        </text>
      </g>

      {/* Risk score — right semicircle */}
      <g>
        <circle
          cx={150} cy={100} r={50}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
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
        <text x={150} y={94} textAnchor="middle" fontSize={24} fontWeight={800} fill="white">
          {riskScore}
        </text>
        <text x={150} y={114} textAnchor="middle" fontSize={9} fill="#6E6E6E" fontWeight={600}>
          Risk
        </text>
      </g>
    </svg>
  );
}
