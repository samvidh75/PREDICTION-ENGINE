/**
 * Portfolio Analytics Component
 * Advanced analytics: sector breakdown, performance history, risk metrics
 */

import { useEffect, useState } from 'react';
import { portfolioStorage } from '../../utils/portfolioStorage';
import { sectorAnalysisService, type SectorAnalysis } from '../../utils/sectorAnalysis';

interface AnalyticsData {
  sectorAnalysis: SectorAnalysis | null;
  riskScore: number;
  sharpeRatio: number;
  volatility: number;
  loading: boolean;
}

export default function PortfolioAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    sectorAnalysis: null,
    riskScore: 0,
    sharpeRatio: 0,
    volatility: 0,
    loading: true,
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        await portfolioStorage.init();
        const portfolio = await portfolioStorage.getPortfolio('default');

        if (!portfolio || portfolio.holdings.length === 0) {
          setAnalytics((prev) => ({ ...prev, loading: false }));
          return;
        }

        const stats = await portfolioStorage.getPortfolioStats('default');

        // Analyze sectors - map holdings to expected format
        const holdingsForAnalysis = stats.holdings.map((h: any) => ({
          ticker: h.ticker,
          value: h.currentValue,
          gain: h.gain,
          gainPercent: h.gainPercent,
        }));
        const sectorAnalysis = sectorAnalysisService.analyzeSectorAllocation(holdingsForAnalysis);

        // Calculate risk metrics (mock data - would integrate with real history)
        const riskScore = sectorAnalysis.sectors
          .filter((s) => sectorAnalysisService.getSectorInfo(s.sector)?.riskLevel === 'high')
          .reduce((sum, s) => sum + s.allocation, 0);

        setAnalytics({
          sectorAnalysis,
          riskScore,
          sharpeRatio: 1.2, // Mock
          volatility: 8.5, // Mock
          loading: false,
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setAnalytics((prev) => ({ ...prev, loading: false }));
      }
    };

    loadAnalytics();
  }, []);

  if (analytics.loading || !analytics.sectorAnalysis) {
    return null;
  }

  const { sectorAnalysis } = analytics;

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        <div>📊 Portfolio Analytics</div>
        <span style={{ fontSize: '16px' }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {!expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginTop: '8px',
            fontSize: '12px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#666' }}>Risk Profile</div>
            <div style={{ fontWeight: 'bold', color: sectorAnalysis.riskProfile === 'aggressive' ? '#ea4335' : sectorAnalysis.riskProfile === 'conservative' ? '#34a853' : '#ffa500' }}>
              {sectorAnalysis.riskProfile.charAt(0).toUpperCase() + sectorAnalysis.riskProfile.slice(1)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#666' }}>Sectors</div>
            <div style={{ fontWeight: 'bold' }}>{sectorAnalysis.sectors.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#666' }}>Diversification</div>
            <div style={{ fontWeight: 'bold', color: sectorAnalysis.diversified ? '#34a853' : '#ffa500' }}>
              {sectorAnalysis.diversified ? '✅ Good' : '⚠️ Limited'}
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {/* Risk Metrics */}
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>⚠️ Risk Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#666' }}>Risk Level</div>
                <div
                  style={{
                    fontWeight: 'bold',
                    color:
                      sectorAnalysis.riskProfile === 'aggressive'
                        ? '#ea4335'
                        : sectorAnalysis.riskProfile === 'conservative'
                          ? '#34a853'
                          : '#ffa500',
                  }}
                >
                  {sectorAnalysis.riskProfile.charAt(0).toUpperCase() + sectorAnalysis.riskProfile.slice(1)}
                </div>
              </div>
              <div>
                <div style={{ color: '#666' }}>High-Risk Allocation</div>
                <div style={{ fontWeight: 'bold' }}>{analytics.riskScore.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Volatility</div>
                <div style={{ fontWeight: 'bold' }}>{analytics.volatility.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Sharpe Ratio</div>
                <div style={{ fontWeight: 'bold' }}>{analytics.sharpeRatio.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Sector Breakdown */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>🏭 Sector Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sectorAnalysis.sectors.map((sector, idx) => (
                <div key={sector.sector} style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{sector.sector}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>{sector.tickers.join(', ')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{sector.allocation.toFixed(1)}%</div>
                      <div style={{ fontSize: '10px', color: sector.returnPercent > 0 ? '#34a853' : '#ea4335' }}>
                        {sector.returnPercent > 0 ? '+' : ''}
                        {sector.returnPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: '4px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(sector.allocation, 5)}%`,
                        backgroundColor: `hsl(${idx * 60}, 70%, 50%)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {sectorAnalysis.recommendations.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>💡 Recommendations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sectorAnalysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      backgroundColor: rec.includes('✅') ? '#dffce7' : rec.includes('⚠️') ? '#fff3cd' : '#f0f0f0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: rec.includes('✅') ? '1px solid #34a853' : rec.includes('⚠️') ? '1px solid #ffc107' : '1px solid #e0e0e0',
                      lineHeight: '1.4',
                    }}
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diversification Badge */}
          <div
            style={{
              padding: '10px',
              backgroundColor: sectorAnalysis.diversified ? '#dffce7' : '#fff3cd',
              border: sectorAnalysis.diversified ? '1px solid #34a853' : '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            {sectorAnalysis.diversified ? '✅ Portfolio is well-diversified across sectors' : '⚠️ Consider diversifying into more sectors'}
          </div>
        </div>
      )}
    </div>
  );
}
