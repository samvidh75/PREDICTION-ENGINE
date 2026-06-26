interface FundamentalScoreBadgeProps {
  score: number;
  label: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#1A7F4B';
  if (score >= 60) return '#1A56DB';
  if (score >= 40) return '#FFA500';
  return '#DC2626';
}

export function FundamentalScoreBadge({ score, label }: FundamentalScoreBadgeProps) {
  const color = getScoreColor(score);

  return (
    <div style={{
      padding: '20px 24px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E5E5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>Fundamental Score</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 28, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 14, fontWeight: 400, color: '#999' }}>/100</span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 20,
          background: `${color}1A`,
          color,
          fontSize: 13,
          fontWeight: 700,
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}
