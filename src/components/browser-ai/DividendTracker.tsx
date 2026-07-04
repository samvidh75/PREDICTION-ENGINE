/**
 * Dividend Tracker Component
 * Displays dividend income, TDS, and tax optimization strategies
 */

import { useEffect, useState } from 'react';
import { portfolioStorage } from '../../utils/portfolioStorage';
import { dividendTrackingService, type DividendPortfolioStats } from '../../utils/dividendTrackingService';

interface DividendData {
  stats: DividendPortfolioStats | null;
  loading: boolean;
}

export default function DividendTracker() {
  const [dividendData, setDividendData] = useState<DividendData>({ stats: null, loading: true });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadDividendData = async () => {
      try {
        await portfolioStorage.init();
        const portfolio = await portfolioStorage.getPortfolio('default');

        if (!portfolio || portfolio.holdings.length === 0) {
          setDividendData({ stats: null, loading: false });
          return;
        }

        // Map portfolio holdings to format for dividend service
        const holdings = portfolio.holdings.map((h) => ({
          ticker: h.ticker,
          quantity: h.quantity,
          currentPrice: 0, // Would need live price here
        }));

        const stats = dividendTrackingService.calculatePortfolioStats(holdings);
        setDividendData({ stats, loading: false });
      } catch (error) {
        console.error('Failed to load dividend data:', error);
        setDividendData({ stats: null, loading: false });
      }
    };

    loadDividendData();
  }, []);

  if (dividendData.loading || !dividendData.stats) {
    return null;
  }

  const { stats } = dividendData;
  const hasNoDividends = stats.totalDividends === 0;

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
        <div>💰 Dividend Income</div>
        <span style={{ fontSize: '16px' }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {!expanded && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          {hasNoDividends ? (
            'No dividend income tracked'
          ) : (
            <>
              Annual: ₹{stats.annualIncome.toLocaleString('en-IN')} | Yield: {stats.averageDividendYield.toFixed(2)}%
            </>
          )}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {hasNoDividends ? (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#856404',
              }}
            >
              📌 Your portfolio has {stats.holdingsWithDividends} dividend-paying stocks. Add more dividend stocks to build passive income.
            </div>
          ) : (
            <>
              {/* Income Summary */}
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>📊 Annual Income</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: '#666' }}>Total Dividends</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      ₹{stats.totalDividends.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>TDS Deducted (10%)</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ea4335' }}>
                      ₹{stats.totalTDS.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>Net After TDS</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#34a853' }}>
                      ₹{stats.totalNetDividends.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>Monthly Income</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      ₹{stats.monthlyIncome.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>Average Yield</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{stats.averageDividendYield.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>Dividend Stocks</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{stats.holdingsWithDividends}</div>
                  </div>
                </div>
              </div>

              {/* Next Payment */}
              {stats.nextPaymentDue && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '12px', color: '#1976d2' }}>
                    📅 Next Dividend Payment
                  </div>
                  <div style={{ fontSize: '12px', color: '#0d47a1' }}>
                    Due: {new Date(stats.nextPaymentDue).toLocaleDateString('en-IN')} | Amount: ₹
                    {stats.nextPaymentAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>💡 Tax Strategies</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      padding: '8px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    📌 Dividend income is taxable. TDS of 10% is deducted at source. Additional income tax applies based on your tax slab.
                  </div>

                  <div
                    style={{
                      padding: '8px',
                      backgroundColor: '#dffce7',
                      border: '1px solid #34a853',
                      borderRadius: '4px',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    🟢 Building dividend portfolio generates passive income. Reinvest dividends for compound growth (DRIPs available on NSE/BSE).
                  </div>

                  <div
                    style={{
                      padding: '8px',
                      backgroundColor: '#e8f5e9',
                      border: '1px solid #66bb6a',
                      borderRadius: '4px',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    💰 Your total dividend income (₹{stats.taxableIncome.toLocaleString('en-IN')}) will be added to your total income for ITR filing.
                  </div>
                </div>
              </div>

              {/* Dividend Yield Grades */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>📈 Yield Analysis</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                  <div
                    style={{
                      padding: '8px',
                      backgroundColor: stats.averageDividendYield > 3 ? '#d4edda' : '#fff3cd',
                      border: `1px solid ${stats.averageDividendYield > 3 ? '#28a745' : '#ffc107'}`,
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ color: '#666', marginBottom: '4px' }}>Average Yield</div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {stats.averageDividendYield.toFixed(2)}%
                      {stats.averageDividendYield > 3 ? ' 🟢 Good' : stats.averageDividendYield > 1.5 ? ' 🟡 Fair' : ' 🔴 Low'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px',
                      backgroundColor: '#e3f2fd',
                      border: '1px solid #2196f3',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ color: '#666', marginBottom: '4px' }}>Effective Yield (After TDS)</div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {(stats.averageDividendYield * 0.9).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#856404',
                }}
              >
                ⚠️ <strong>Tax Disclaimer:</strong> Dividend information is for educational purposes. For tax planning, consult your CA. TDS rates and tax slabs may change based on latest rules.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
