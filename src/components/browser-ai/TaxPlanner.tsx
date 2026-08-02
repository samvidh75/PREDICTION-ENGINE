/**
 * Tax Planner Component
 * Displays tax implications and optimization suggestions
 */

import { useEffect, useState } from 'react';
import { portfolioStorage } from '../../utils/portfolioStorage';
import { taxPlanningService, type TaxSummary } from '../../utils/taxPlanningService';
import { portfolioExportService } from '../../utils/portfolioExportService';

interface TaxData {
  summary: TaxSummary | null;
  loading: boolean;
}

export default function TaxPlanner() {
  const [taxData, setTaxData] = useState<TaxData>({ summary: null, loading: true });
  const [expanded, setExpanded] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    const loadTaxData = async () => {
      try {
        await portfolioStorage.init();
        const portfolio = await portfolioStorage.getPortfolio('default');

        if (!portfolio || portfolio.holdings.length === 0) {
          setTaxData({ summary: null, loading: false });
          return;
        }

        // Map portfolio holdings to tax calculation format
        const holdingsForTax = portfolio.holdings.map((h) => ({
          ticker: h.ticker,
          quantity: h.quantity,
          buyPrice: h.buyPrice,
          currentPrice: 0, // Would need to fetch current prices
          buyDate: h.buyDate,
        }));

        const summary = taxPlanningService.calculateTaxSummary(holdingsForTax);
        setTaxData({ summary, loading: false });
      } catch (error) {
        console.error('Failed to load tax data:', error);
        setTaxData({ summary: null, loading: false });
      }
    };

    loadTaxData();
  }, []);

  const handleExport = async (format: 'csv' | 'json' | 'html') => {
    try {
      const portfolio = await portfolioStorage.getPortfolio('default');
      if (!portfolio) return;

      const stats = await portfolioStorage.getPortfolioStats('default');

      const holdingsData = stats.holdings.map((h: any) => ({
        ticker: h.ticker,
        quantity: h.quantity,
        buyPrice: h.buyPrice,
        currentPrice: h.currentPrice,
        allocation: h.allocation,
        gain: h.gain,
        gainPercent: h.gainPercent,
      }));

      const totals = {
        invested: stats.totalInvested,
        value: stats.currentValue,
        return: stats.totalReturn,
        returnPercent: stats.totalReturnPercent,
      };

      const exportData =
        format === 'csv' ? portfolioExportService.exportToCSV(holdingsData, totals) :
        format === 'json' ? portfolioExportService.exportToJSON(holdingsData, totals) :
        portfolioExportService.exportToHTML(holdingsData, totals);

      portfolioExportService.downloadFile(exportData);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (taxData.loading || !taxData.summary) {
    return null;
  }

  const { summary } = taxData;

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
        <div>💰 Tax Planning & Exports</div>
        <span style={{ fontSize: '16px' }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {!expanded && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          Tax liability: ₱{summary.totalTax.toLocaleString('en-PH')} ({summary.effectiveTaxRate.toFixed(1)}%)
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {/* Tax Summary */}
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>📊 Tax Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#666' }}>Total Gains</div>
                <div style={{ fontWeight: 'bold' }}>₱{summary.totalGains.toLocaleString('en-PH')}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Total Tax Liability</div>
                <div style={{ fontWeight: 'bold', color: '#ea4335' }}>₱{summary.totalTax.toLocaleString('en-PH')}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Short-term Gains (STCG)</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                  ₱{summary.shortTermGains.toLocaleString('en-PH')} (Tax: ₱{summary.totalSTCGTax.toLocaleString('en-PH')})
                </div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Long-term Gains (LTCG)</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                  ₱{summary.longTermGains.toLocaleString('en-PH')} (Tax: ₱{summary.totalLTCGTax.toLocaleString('en-PH')})
                </div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Effective Tax Rate</div>
                <div style={{ fontWeight: 'bold' }}>{summary.effectiveTaxRate.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Net Gains (After Tax)</div>
                <div style={{ fontWeight: 'bold', color: summary.netGains > 0 ? '#34a853' : '#ea4335' }}>
                  ₱{summary.netGains.toLocaleString('en-PH')}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {summary.recommendations.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>💡 Tax Optimization Tips</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {summary.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      backgroundColor: rec.includes('🟢') ? '#dffce7' : rec.includes('🔴') ? '#fce8e6' : '#fff3cd',
                      border: rec.includes('🟢') ? '1px solid #34a853' : rec.includes('🔴') ? '1px solid #ea4335' : '1px solid #ffc107',
                      borderRadius: '4px',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>📥 Export Portfolio</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <button
                onClick={() => handleExport('csv')}
                style={{
                  padding: '8px',
                  backgroundColor: '#0084ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                📄 CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                style={{
                  padding: '8px',
                  backgroundColor: '#0084ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                📋 JSON
              </button>
              <button
                onClick={() => handleExport('html')}
                style={{
                  padding: '8px',
                  backgroundColor: '#0084ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                🖨️ HTML
              </button>
            </div>
            {exported && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#34a853', fontWeight: 'bold' }}>
                ✅ Downloaded successfully!
              </div>
            )}
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
            ⚠️ <strong>Disclaimer:</strong> This is educational information only. For accurate tax calculations and optimization strategies, consult a qualified CA or tax advisor. Tax laws may change and individual circumstances vary.
          </div>
        </div>
      )}
    </div>
  );
}
