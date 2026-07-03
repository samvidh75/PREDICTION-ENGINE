import { useState } from 'react';
import { useQuotes } from '../hooks/useQuote';

/**
 * Enhanced Screener component that combines:
 * - Stock universe metadata (sector, market cap)
 * - Real-time quotes (price, change %)
 * - Factor scores (quality, valuation, growth, etc.)
 */
export function EnhancedScreener() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['RELIANCE', 'TCS', 'INFY', 'WIPRO', 'HDFC']);
  const [filters, setFilters] = useState({
    sector: '',
    minQualityScore: 0,
    maxPE: 100,
  });

  // Fetch live quotes for selected symbols
  const { quotes, loading, error } = useQuotes(
    selectedSymbols.map((s) => (s.endsWith('.NS') ? s : `${s}.NS`)),
    5000, // 5-second refresh
  );

  const handleAddSymbol = () => {
    const newSymbol = prompt('Enter symbol (e.g., RELIANCE):');
    if (newSymbol) {
      setSelectedSymbols([...selectedSymbols, newSymbol.toUpperCase()]);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Enhanced Screener (Live + Fundamentals)</h1>

      {/* Filter Panel */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label>Sector:</label>
            <input
              type="text"
              value={filters.sector}
              onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
              placeholder="e.g., Technology, Finance"
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div>
            <label>Min Quality Score:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minQualityScore}
              onChange={(e) => setFilters({ ...filters, minQualityScore: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
            <small>{filters.minQualityScore}</small>
          </div>
          <div>
            <label>Max P/E Ratio:</label>
            <input
              type="number"
              value={filters.maxPE}
              onChange={(e) => setFilters({ ...filters, maxPE: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
        </div>
      </div>

      {/* Add Symbol Button */}
      <button onClick={handleAddSymbol} style={{ padding: '8px 16px', marginBottom: '20px' }}>
        + Add Symbol
      </button>

      {/* Loading State */}
      {loading && <p style={{ color: '#666' }}>Fetching live quotes...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {/* Results Table */}
      {quotes.size > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Symbol</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Price</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Change %</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Volume</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Bid-Ask</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(quotes.values()).map((quote) => (
                <tr key={quote.symbol} style={{ borderBottom: '1px solid #eee', backgroundColor: quote.cached ? '#fffef0' : '#fff' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{quote.symbol}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{quote.price.toFixed(2)}</td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      color: quote.changePercent >= 0 ? '#28a745' : '#dc3545',
                      fontWeight: 'bold',
                    }}
                  >
                    {quote.changePercent >= 0 ? '+' : ''}
                    {quote.changePercent.toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {(quote.volume / 1000000).toFixed(1)}M
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>
                    {quote.bid !== undefined && quote.ask !== undefined
                      ? `₹${quote.bid.toFixed(0)}-${quote.ask.toFixed(0)}`
                      : '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: quote.source === 'yfinance' ? '#0066cc' : quote.source === 'jugasad' ? '#cc6600' : '#666',
                      fontWeight: 'bold',
                    }}
                  >
                    {quote.source}
                    {quote.cached && ' (cached)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px', fontSize: '14px', color: '#004085' }}>
        <p>
          <strong>How it works:</strong> Live quotes are fetched from yfinance, NSE (jugasad), and screener.in in parallel.
          Cached quotes are shown with (cached) label and restore instantly on page reload.
        </p>
        <p>
          <strong>Next:</strong> Add factor scores, technical indicators, and more fundamental metrics to the table above.
        </p>
      </div>
    </div>
  );
}
