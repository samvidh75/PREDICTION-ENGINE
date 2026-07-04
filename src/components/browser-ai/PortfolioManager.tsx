/**
 * Portfolio Manager Component
 * Add/edit/view user holdings
 */

import { useEffect, useState } from 'react';
import { portfolioStorage, type Portfolio, type Holding } from '../../utils/portfolioStorage';

interface PortfolioManagerProps {
  onPortfolioChange?: (portfolio: Portfolio | null) => void;
}

export default function PortfolioManager({ onPortfolioChange }: PortfolioManagerProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    buyPrice: '',
    notes: '',
  });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load portfolio on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      await portfolioStorage.init();
      const p = await portfolioStorage.getPortfolio('default');
      setPortfolio(p);
      if (onPortfolioChange) onPortfolioChange(p);

      // Load stats
      if (p && p.holdings.length > 0) {
        const s = await portfolioStorage.getPortfolioStats('default');
        setStats(s);
      }
    };
    loadPortfolio();
  }, [onPortfolioChange]);

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker || !formData.quantity || !formData.buyPrice) return;

    setLoading(true);
    try {
      const currentPortfolio = portfolio || {
        userId: 'default',
        holdings: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalInvested: 0,
      };

      const newHolding: Holding = {
        id: `holding-${Date.now()}`,
        ticker: formData.ticker.toUpperCase(),
        quantity: parseFloat(formData.quantity),
        buyPrice: parseFloat(formData.buyPrice),
        buyDate: Date.now(),
        notes: formData.notes || undefined,
      };

      currentPortfolio.holdings.push(newHolding);
      await portfolioStorage.savePortfolio(currentPortfolio);

      setPortfolio(currentPortfolio);
      if (onPortfolioChange) onPortfolioChange(currentPortfolio);

      // Reset form
      setFormData({ ticker: '', quantity: '', buyPrice: '', notes: '' });
      setShowForm(false);

      // Reload stats
      const s = await portfolioStorage.getPortfolioStats('default');
      setStats(s);
    } catch (error) {
      console.error('Failed to add holding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHolding = async (holdingId: string) => {
    if (!portfolio) return;

    setLoading(true);
    try {
      const newHoldings = portfolio.holdings.filter((h) => h.id !== holdingId);
      const updated = { ...portfolio, holdings: newHoldings };
      await portfolioStorage.savePortfolio(updated);

      setPortfolio(updated);
      if (onPortfolioChange) onPortfolioChange(updated);

      // Reload stats
      const s = await portfolioStorage.getPortfolioStats('default');
      setStats(s);
    } catch (error) {
      console.error('Failed to remove holding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearPortfolio = async () => {
    if (!confirm('Clear entire portfolio? This cannot be undone.')) return;

    setLoading(true);
    try {
      await portfolioStorage.clearPortfolio('default');
      setPortfolio(null);
      setStats(null);
      if (onPortfolioChange) onPortfolioChange(null);
    } catch (error) {
      console.error('Failed to clear portfolio:', error);
    } finally {
      setLoading(false);
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0 }}>💼 My Portfolio</h4>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>
          {showForm ? '✕ Cancel' : '+ Add Stock'}
        </button>
      </div>

      {/* Add Holding Form */}
      {showForm && (
        <form onSubmit={handleAddHolding} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Ticker (e.g., TCS)"
              value={formData.ticker}
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <input
              type="number"
              placeholder="Buy Price (₹)"
              value={formData.buyPrice}
              onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
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
            {loading ? 'Adding...' : 'Add Holding'}
          </button>
        </form>
      )}

      {/* Portfolio Stats */}
      {stats && (
        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <div style={{ color: '#999' }}>Invested</div>
              <div style={{ fontWeight: 'bold' }}>₹{(stats.totalInvested / 100000).toFixed(2)}L</div>
            </div>
            <div>
              <div style={{ color: '#999' }}>Current Value</div>
              <div style={{ fontWeight: 'bold', color: stats.totalReturn > 0 ? '#34a853' : '#ea4335' }}>
                ₹{(stats.currentValue / 100000).toFixed(2)}L
              </div>
            </div>
            <div>
              <div style={{ color: '#999' }}>Total Return</div>
              <div
                style={{
                  fontWeight: 'bold',
                  color: stats.totalReturnPercent > 0 ? '#34a853' : '#ea4335',
                }}
              >
                {stats.totalReturnPercent > 0 ? '+' : ''}
                {stats.totalReturnPercent.toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ color: '#999' }}>Holdings</div>
              <div style={{ fontWeight: 'bold' }}>{stats.holdings.length} stocks</div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings List */}
      {portfolio && portfolio.holdings.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>Your Holdings:</div>
          {portfolio.holdings.map((holding) => {
            const stat = stats?.holdings.find((s: any) => s.ticker === holding.ticker);
            return (
              <div
                key={holding.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginBottom: '6px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{holding.ticker}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{holding.quantity} @ ₹{holding.buyPrice}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {stat && (
                    <>
                      <div
                        style={{
                          fontWeight: 'bold',
                          color: stat.gainPercent > 0 ? '#34a853' : '#ea4335',
                        }}
                      >
                        {stat.gainPercent > 0 ? '+' : ''}
                        {stat.gainPercent.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{stat.allocation.toFixed(1)}% portfolio</div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveHolding(holding.id)}
                  disabled={loading}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {(!portfolio || portfolio.holdings.length === 0) && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
          <div style={{ fontSize: '12px' }}>Add your stocks to get personalized AI insights</div>
        </div>
      )}

      {/* Clear Button */}
      {portfolio && portfolio.holdings.length > 0 && (
        <button
          onClick={handleClearPortfolio}
          disabled={loading}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            color: '#666',
          }}
        >
          Clear Portfolio
        </button>
      )}
    </div>
  );
}
