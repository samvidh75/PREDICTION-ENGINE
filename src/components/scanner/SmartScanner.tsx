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

export function SmartScanner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState<'all' | 'sector'>('all');
  const [freshness, setFreshness] = useState('');

  useEffect(() => {
    fetch('/api/market/status')
      .then(r => r.json())
      .then(d => {
        setFreshness(d.isOpen ? 'Live analysis' : 'Market closed — using cached data');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    runScan();
  }, [scanType]);

  const runScan = async () => {
    setLoading(true);
    try {
      const url = scanType === 'all'
        ? '/api/scanner/all?limit=50'
        : '/api/scanner/sector/Technology?limit=30';
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
        <h2 className={styles.title}>Smart Scanner</h2>
        {freshness && <span className={styles.freshness}>{freshness}</span>}
      </div>

      <div className={styles.tabs}>
        <button
          className={scanType === 'all' ? styles.active : ''}
          onClick={() => setScanType('all')}
        >
          All Stocks
        </button>
        <button
          className={scanType === 'sector' ? styles.active : ''}
          onClick={() => setScanType('sector')}
        >
          Technology
        </button>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>AI scanning stocks...</p>
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
