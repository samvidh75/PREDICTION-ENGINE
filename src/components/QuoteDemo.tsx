import { useState } from 'react';
import { useQuotes } from '../hooks/useQuote';

/**
 * Demo component showing real-time quotes from browser-side API clients.
 * Replace [symbols] with actual stock list to see live price updates.
 */
export function QuoteDemo() {
  const [symbols, setSymbols] = useState(['BDO.PS', 'JFC.PS', 'SM.PS']);
  const { quotes, loading, error, refresh } = useQuotes(symbols, 5000);

  const handleAddSymbol = () => {
    const newSymbol = prompt('Enter symbol (e.g., RELIANCE):');
    if (newSymbol) {
      setSymbols([...symbols, newSymbol.toUpperCase()]);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Real-Time Stock Quotes (Browser-Side API)</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleAddSymbol} style={{ padding: '8px 16px' }}>
          Add Symbol
        </button>
        <button onClick={refresh} style={{ padding: '8px 16px', marginLeft: '10px' }}>
          Refresh Now
        </button>
      </div>

      {loading && <p>Loading quotes...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {quotes.size > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Symbol</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Price</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Change %</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Volume</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Source</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Cached</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(quotes.values()).map((quote) => (
              <tr key={quote.symbol}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{quote.symbol}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  ₱{quote.price.toFixed(2)}
                </td>
                <td
                  style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                    color: quote.changePercent >= 0 ? 'green' : 'red',
                  }}
                >
                  {quote.changePercent >= 0 ? '+' : ''}
                  {quote.changePercent.toFixed(2)}%
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {(quote.volume / 1000000).toFixed(1)}M
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px' }}>
                  {quote.source}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {quote.cached ? '✓' : '○'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>
          <strong>How it works:</strong>
        </p>
        <ul>
          <li>Symbols are fetched from yfinance (CORS-enabled endpoints)</li>
          <li>Results are cached in browser IndexedDB (5-minute TTL for prices)</li>
          <li>Each user device is an independent API consumer (unlimited calls)</li>
          <li>Server only aggregates + broadcasts, doesn't fetch directly</li>
        </ul>
      </div>
    </div>
  );
}
