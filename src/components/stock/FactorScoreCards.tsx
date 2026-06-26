interface FactorScore {
  label: string;
  score: number;
  color: string;
}

interface FactorScoreCardsProps {
  factors?: FactorScore[];
}

const DEFAULT_FACTORS: FactorScore[] = [
  { label: 'Quality', score: 72, color: '#1A7F4B' },
  { label: 'Valuation', score: 58, color: '#FFA500' },
  { label: 'Growth', score: 65, color: '#1A7F4B' },
  { label: 'Risk', score: 45, color: '#DC2626' },
  { label: 'Tech', score: 70, color: '#1A56DB' },
];

export function FactorScoreCards({ factors = DEFAULT_FACTORS }: FactorScoreCardsProps) {
  return (
    <div style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E5E5E5' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#1A1A1A' }}>
        Factor Scores
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
        {factors.map(f => (
          <div key={f.label} style={{
            background: '#F5F5F5',
            borderRadius: 8,
            padding: '12px 8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: f.color }}>{f.score}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginTop: 4 }}>{f.label}</div>
            <div style={{
              marginTop: 8,
              height: 4,
              background: '#E5E5E5',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${f.score}%`,
                height: '100%',
                background: f.color,
                borderRadius: 2,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
