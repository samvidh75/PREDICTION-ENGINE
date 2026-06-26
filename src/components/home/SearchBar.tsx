import { useState, useEffect, useCallback } from 'react';
import styles from './SearchBar.module.css';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [freshness, setFreshness] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        searchStocks(query);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetch('/api/market/status')
      .then(r => r.json())
      .then(d => {
        if (d.isOpen) setFreshness('Live prices');
        else setFreshness(d.dayStatus === 'weekend' ? 'Market closed (weekend)' : 'Snapshot data');
      })
      .catch(() => setFreshness(''));
  }, []);

  const searchStocks = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}&limit=50`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stocks by symbol or name (e.g., TCS, INFY, RELIANCE)"
          className={styles.input}
        />
        {loading && <span className={styles.spinner} />}
      </div>

      {freshness && (
        <div className={styles.freshness}>{freshness}</div>
      )}

      {results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map(stock => (
            <a
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className={styles.item}
            >
              <span className={styles.symbol}>{stock.symbol}</span>
              <span className={styles.name}>{stock.name}</span>
              {stock.sector && <span className={styles.sector}>{stock.sector}</span>}
            </a>
          ))}
        </div>
      )}

      {!loading && query.trim().length > 0 && results.length === 0 && (
        <div className={styles.empty}>No stocks found for "{query}"</div>
      )}
    </div>
  );
}
