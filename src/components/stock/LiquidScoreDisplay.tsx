interface LiquidScoreDisplayProps {
  qualityScore: number;
  riskScore: number;
}

function ScoreGauge({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = (score / 10) * 100;
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E5E5" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: 'stroke-dasharray 0.5s' }}
        />
        <text x="50" y="50" textAnchor="middle" dy="0.3em"
          style={{ fontSize: 22, fontWeight: 800, fill: color }}>
          {score.toFixed(1)}
        </text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#666' }}>{label}</span>
    </div>
  );
}

export function LiquidScoreDisplay({ qualityScore, riskScore }: LiquidScoreDisplayProps) {
  return (
    <div style={{
      padding: '20px 24px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E5E5',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1A1A1A' }}>
        StockStory Score
      </h3>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <ScoreGauge label="Quality" score={qualityScore} color="#1A7F4B" />
        <div style={{ width: 1, height: 80, background: '#E5E5E5' }} />
        <ScoreGauge label="Risk" score={riskScore} color="#FFA500" />
      </div>
    </div>
  );
}
