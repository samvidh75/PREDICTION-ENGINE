export function BrokerConnectionBanner() {
  return (
    <div style={{
      margin: '16px 20px',
      padding: '12px 16px',
      background: '#FFF3E0',
      border: '1px solid #FFB74D',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔌</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E65100' }}>
          Connect your broker to see live updates
        </span>
      </div>
      <span style={{ fontSize: 18, color: '#E65100' }}>›</span>
    </div>
  );
}
