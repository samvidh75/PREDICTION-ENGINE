export function PerformanceSection() {
  return (
    <div style={{
      padding: '24px 20px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E5E5',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1A1A1A' }}>
        Performance
      </h3>
      <div style={{
        background: '#F5F5F5',
        borderRadius: 8,
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
          Unlock Performance Insights
        </div>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>
          Get detailed performance metrics, peer comparison, and historical analysis.
        </div>
        <button style={{
          padding: '10px 24px',
          background: '#1A56DB',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}
