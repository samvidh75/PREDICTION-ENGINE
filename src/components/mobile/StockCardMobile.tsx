import React from 'react';
import { useNavigate } from 'react-router-dom';

interface StockCardMobileProps {
  symbol: string;
  conviction: number;
  health: string;
  price: number;
  change: number;
  changePercent: number;
}

export function StockCardMobile({ symbol, conviction, health, price, change, changePercent }: StockCardMobileProps) {
  const navigate = useNavigate();
  const isPositive = changePercent >= 0;

  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{symbol}</h3>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>₱{price.toFixed(2)}</p>
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          minWidth: '50px',
          textAlign: 'right' as const,
          background: isPositive ? '#e8f5e9' : '#ffebee',
          color: isPositive ? '#2e7d32' : '#c62828',
        }}>
          {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          background: '#f5f5f5',
          fontWeight: 500,
          whiteSpace: 'nowrap' as const,
        }}>{health}</span>
        <span>Conviction: <strong>{conviction}</strong></span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        <button
          onClick={() => navigate(`/compare?symbols=${symbol}`)}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
            background: '#f0f0f0',
            color: '#333',
          }}
        >
          Compare
        </button>
        <button
          onClick={() => navigate(`/stock/${symbol}`)}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
            background: '#ff6b6b',
            color: '#fff',
          }}
        >
          Research
        </button>
      </div>
    </div>
  );
}
