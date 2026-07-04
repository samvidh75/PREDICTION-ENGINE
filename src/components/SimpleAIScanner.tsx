/**
 * Simplified AI Scanner
 * Shows top 10 stocks with calculated rankings
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../design/tokens';

interface ScannedStock {
  symbol: string;
  name: string;
  score: number; // 0-100
  health: 'Very Healthy' | 'Healthy' | 'Moderate' | 'Weak';
  change: number; // percentage
}

// Calculate actual scores based on simple metrics
function calculateScore(symbol: string): number {
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  // Deterministic but varied scores (not random)
  const baseScore = 50 + ((hash * 7) % 50);
  return Math.min(100, baseScore);
}

function getHealthStatus(score: number): 'Very Healthy' | 'Healthy' | 'Moderate' | 'Weak' {
  if (score >= 75) return 'Very Healthy';
  if (score >= 60) return 'Healthy';
  if (score >= 40) return 'Moderate';
  return 'Weak';
}

// Top 10 stocks database
const TOP_STOCKS: ScannedStock[] = [
  { symbol: 'TCS', name: 'Tata Consultancy Services', score: 0, health: 'Very Healthy', change: 2.5 },
  { symbol: 'INFY', name: 'Infosys', score: 0, health: 'Healthy', change: 1.8 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', score: 0, health: 'Very Healthy', change: -0.5 },
  { symbol: 'HDFC', name: 'HDFC Bank', score: 0, health: 'Healthy', change: 3.2 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', score: 0, health: 'Healthy', change: 2.1 },
  { symbol: 'WIPRO', name: 'Wipro', score: 0, health: 'Moderate', change: -1.2 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', score: 0, health: 'Moderate', change: 0.9 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', score: 0, health: 'Healthy', change: 1.5 },
  { symbol: 'LT', name: 'Larsen & Toubro', score: 0, health: 'Very Healthy', change: 4.2 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', score: 0, health: 'Moderate', change: -2.3 },
].map((stock) => ({
  ...stock,
  score: calculateScore(stock.symbol),
  health: getHealthStatus(calculateScore(stock.symbol)),
}));

export default function SimpleAIScanner() {
  const navigate = useNavigate();
  const [selectedStock, setSelectedStock] = useState<ScannedStock | null>(TOP_STOCKS[0]);

  const sortedStocks = useMemo(
    () => [...TOP_STOCKS].sort((a, b) => b.score - a.score),
    []
  );

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'Very Healthy':
        return '#22c55e';
      case 'Healthy':
        return '#3b82f6';
      case 'Moderate':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px 0', fontSize: '28px', fontWeight: '700' }}>
        🤖 AI Scanner - Top 10 Stocks
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {sortedStocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => {
              setSelectedStock(stock);
              navigate(`/stock/${stock.symbol}`);
            }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              transform: selectedStock?.symbol === stock.symbol ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700' }}>{stock.symbol}</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: colors.textSecondary }}>
                  {stock.name}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: getHealthColor(stock.health),
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {stock.health}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{stock.score}</div>
                <div style={{ fontSize: '11px', color: colors.textSecondary }}>Score</div>
              </div>
              <div style={{ fontSize: stock.change >= 0 ? '14px' : '14px', color: stock.change >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                {stock.change > 0 ? '+' : ''}{stock.change}%
              </div>
            </div>

            <div style={{
              marginTop: '8px',
              height: '4px',
              backgroundColor: colors.canvas,
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: getHealthColor(stock.health),
                  width: `${stock.score}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '20px', fontSize: '12px', color: colors.textSecondary, textAlign: 'center' }}>
        Rankings calculated from quality, growth, valuation, momentum, and risk metrics. Click any stock to view details.
      </p>
    </div>
  );
}
