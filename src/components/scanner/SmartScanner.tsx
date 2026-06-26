import { useState, useEffect } from 'react';
import styles from './SmartScanner.module.css';

interface ScanResult {
  symbol: string;
  name: string;
  rating: number;
  qualityScore: number;
  valuationScore: number;
  growthScore: number;
  riskScore: number;
  source: string;
  scannedAt: string;
}

type Strategy = 'all' | 'value' | 'growth' | 'quality' | 'momentum';

const STRATEGIES: { key: Strategy; label: string }[] = [
  { key: 'all', label: 'Top Rated' },
  { key: 'value', label: 'Best Value' },
  { key: 'growth', label: 'High Growth' },
  { key: 'quality', label: 'Quality' },
  { key: 'momentum', label: 'Momentum' },
];

export function SmartScanner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('all');
  const [marketState, setMarketState] = useState('');

  useEffect(() => {
    fetch('/api/market/status')
      .then(r => r.json())
      .then(d => {
        setMarketState(d.isOpen ? 'Live AI analysis' : 'Market closed — using cached data');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    runScan();
  }, [strategy]);

  const runScan = async () => {
    setLoading(true);
    try {
      const url = `/api/scanner/strategy?strategy=${strategy}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 70) return styles.high;
    if (score >= 45) return styles.med;
    return styles.low;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>AI Smart Scanner</h2>
        {marketState && <span className={styles.marketStateLabel}>{marketState}</span>}
      </div>

      <div className={styles.tabs}>
        {STRATEGIES.map(s => (
          <button
            key={s.key}
            className={strategy === s.key ? styles.active : ''}
            onClick={() => setStrategy(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>AI scanning stocks ({strategy})...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span className={styles.colSymbol}>Symbol</span>
            <span className={styles.colName}>Name</span>
            <span className={styles.colScore}>Quality</span>
            <span className={styles.colScore}>Value</span>
            <span className={styles.colScore}>Growth</span>
            <span className={styles.colScore}>Risk</span>
          </div>
          {results.map(r => (
            <a
              key={r.symbol}
              href={`/stock/${r.symbol}`}
              className={styles.row}
            >
              <span className={styles.colSymbol}>{r.symbol}</span>
              <span className={styles.colName}>{r.name}</span>
              <span className={`${styles.colScore} ${getScoreClass(r.qualityScore)}`}>{r.qualityScore}</span>
              <span className={`${styles.colScore} ${getScoreClass(r.valuationScore)}`}>{r.valuationScore}</span>
              <span className={`${styles.colScore} ${getScoreClass(r.growthScore)}`}>{r.growthScore}</span>
              <span className={`${styles.colScore} ${getScoreClass(r.riskScore)}`}>{r.riskScore}</span>
            </a>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className={styles.empty}>No scan results available</div>
      )}
    </div>
  );
}
