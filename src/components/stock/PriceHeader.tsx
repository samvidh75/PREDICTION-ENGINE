interface PriceHeaderProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  exchange: string;
}

export function PriceHeader({ symbol, name, price, change, changePercent, timestamp, exchange }: PriceHeaderProps) {
  const isPositive = change >= 0;
  const color = isPositive ? '#1A7F4B' : '#DC2626';
  const arrow = isPositive ? '↑' : '↓';

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E5', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#1A1A1A' }}>{symbol}</h1>
        <span style={{ fontSize: 11, color: '#666', background: '#F5F5F5', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>{exchange}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A' }}>₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color }}>{isPositive ? '+' : ''}{change.toFixed(2)}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{arrow} {Math.abs(changePercent).toFixed(2)}%</span>
      </div>
      <div style={{ fontSize: 11, color: '#999' }}>{timestamp}</div>
    </div>
  );
}
