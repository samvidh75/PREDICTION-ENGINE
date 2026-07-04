/**
 * Portfolio Performance Charts Component
 * Visual analysis of portfolio performance and allocation
 */

import { useEffect, useState } from 'react';
import { portfolioStorage } from '../../utils/portfolioStorage';
import type { Portfolio } from '../../utils/portfolioStorage';

interface ChartData {
  labels: string[];
  values: number[];
}

export default function PortfolioCharts() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [allocationChart, setAllocationChart] = useState<ChartData | null>(null);
  const [performanceChart, setPerformanceChart] = useState<ChartData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await portfolioStorage.init();
        const p = await portfolioStorage.getPortfolio('default');
        setPortfolio(p);

        if (p && p.holdings.length > 0) {
          const s = await portfolioStorage.getPortfolioStats('default');
          setStats(s);

          // Build allocation chart data
          const allocData: ChartData = {
            labels: s.holdings.map((h: any) => h.ticker),
            values: s.holdings.map((h: any) => h.allocation),
          };
          setAllocationChart(allocData);

          // Build performance chart data (gain/loss %)
          const perfData: ChartData = {
            labels: s.holdings.map((h: any) => h.ticker),
            values: s.holdings.map((h: any) => h.gainPercent),
          };
          setPerformanceChart(perfData);
        }
      } catch (error) {
        console.error('Failed to load portfolio data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [portfolio]);

  if (loading || !portfolio || portfolio.holdings.length === 0) {
    return null;
  }

  const renderAllocationChart = () => {
    if (!allocationChart) return null;

    return (
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '12px 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>📊 Portfolio Allocation</h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '150px' }}>
          {allocationChart.values.map((value, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  height: `${value * 1.5}px`,
                  backgroundColor: `hsl(${idx * 60}, 70%, 50%)`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                }}
              />
              <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>
                {allocationChart.labels[idx]}
              </div>
              <div style={{ fontSize: '9px', color: '#999' }}>{value.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPerformanceChart = () => {
    if (!performanceChart) return null;

    const maxValue = Math.max(...performanceChart.values.map(Math.abs));
    const scale = 100 / (maxValue || 1);

    return (
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '12px 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>📈 Performance (Gain/Loss %)</h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '120px' }}>
          {performanceChart.values.map((value, idx) => {
            const isPositive = value >= 0;
            const barHeight = Math.abs(value) * scale;
            const color = isPositive ? '#34a853' : '#ea4335';

            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '9px', color: '#999', minHeight: '12px' }}>
                  {value > 0 ? '+' : ''}
                  {value.toFixed(1)}%
                </div>
                <div
                  style={{
                    width: '100%',
                    height: `${barHeight}px`,
                    backgroundColor: color,
                    borderRadius: isPositive ? '4px 4px 0 0' : '0 0 4px 4px',
                    minHeight: '4px',
                    opacity: 0.8,
                  }}
                />
                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>
                  {performanceChart.labels[idx]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMetrics = () => {
    if (!stats) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total Invested</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{(stats.totalInvested / 100000).toFixed(2)}L</div>
        </div>
        <div
          style={{
            padding: '12px',
            backgroundColor: stats.totalReturn > 0 ? '#dffce7' : '#fce8e6',
            borderRadius: '6px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Current Value</div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: stats.totalReturn > 0 ? '#34a853' : '#ea4335',
            }}
          >
            ₹{(stats.currentValue / 100000).toFixed(2)}L
          </div>
        </div>
        <div
          style={{
            padding: '12px',
            backgroundColor: stats.totalReturnPercent > 0 ? '#dffce7' : '#fce8e6',
            borderRadius: '6px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total Return</div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: stats.totalReturnPercent > 0 ? '#34a853' : '#ea4335',
            }}
          >
            {stats.totalReturnPercent > 0 ? '+' : ''}
            {stats.totalReturnPercent.toFixed(2)}%
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Absolute Gain</div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: stats.totalReturn > 0 ? '#34a853' : '#ea4335',
            }}
          >
            {stats.totalReturn > 0 ? '+' : ''}₹{(stats.totalReturn / 100000).toFixed(2)}L
          </div>
        </div>
      </div>
    );
  };

  const renderHoldings = () => {
    if (!stats || stats.holdings.length === 0) return null;

    return (
      <div>
        <h4 style={{ margin: '12px 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>📋 Holdings Breakdown</h4>
        <div style={{ display: 'grid', gap: '8px' }}>
          {stats.holdings.map((holding: any, idx: number) => (
            <div key={idx} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{holding.ticker}</div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: holding.gainPercent > 0 ? '#34a853' : '#ea4335',
                  }}
                >
                  {holding.gainPercent > 0 ? '+' : ''}
                  {holding.gainPercent.toFixed(2)}%
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#666' }}>
                <div>
                  <div>Qty: {holding.quantity}</div>
                  <div>Buy: ₹{holding.buyPrice}</div>
                </div>
                <div>
                  <div>Current: ₹{holding.currentPrice.toFixed(2)}</div>
                  <div>Value: ₹{(holding.currentValue / 100000).toFixed(2)}L</div>
                </div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '10px', color: '#999' }}>
                Allocation: {holding.allocation.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '16px',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>📈 Portfolio Performance</h3>

      {renderMetrics()}
      {renderAllocationChart()}
      {renderPerformanceChart()}
      {renderHoldings()}
    </div>
  );
}
