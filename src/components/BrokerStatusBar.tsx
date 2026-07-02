import React, { useEffect, useState } from 'react';

export default function BrokerStatusBar() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({ upstox: false, zerodha: false });
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/broker/status-map')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && data.statuses) {
          setStatuses({
            upstox: data.statuses.upstox?.isConnected && !data.statuses.upstox?.isExpired,
            zerodha: data.statuses.zerodha?.isConnected && !data.statuses.zerodha?.isExpired
          });
        }
      }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      display: 'flex', gap: '16px', padding: '10px 24px',
      backgroundColor: '#0D0D0D', borderBottom: '1px solid #1A1A1A',
      fontFamily: 'monospace', fontSize: '11px', alignItems: 'center'
    }}>
      <span style={{ color: '#64748b', fontWeight: 'bold' }}>NETWORK NODE AUTHENTICATIONS:</span>
      {error ? (
        <span style={{ color: '#EF4444' }}>UNAVAILABLE</span>
      ) : (
        Object.entries(statuses).map(([broker, isLive]) => (
          <div key={broker} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: isLive ? '#34d399' : '#EF4444',
              boxShadow: isLive ? '0 0 8px #34d399' : 'none'
            }} />
            <span style={{
              color: isLive ? '#f4f4f5' : '#4b5563',
              textTransform: 'uppercase', fontWeight: 'bold'
            }}>{broker}</span>
          </div>
        ))
      )}
    </div>
  );
}
