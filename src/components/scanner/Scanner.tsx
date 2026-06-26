import { useState, useEffect } from 'react';
import styles from './Scanner.module.css';

const PRESETS = ['Quality', 'Growth', 'Value', 'Dividend'];

export function Scanner() {
  const [selectedPreset, setSelectedPreset] = useState('Quality');
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStocks(selectedPreset);
  }, [selectedPreset]);

  const loadStocks = async (_preset: string) => {
    setLoading(true);
    const mockStocks = [
      { symbol: 'TCS', name: 'TATA Consultancy Services', score: 75, pe: 28, roe: 46 },
      { symbol: 'INFY', name: 'Infosys Limited', score: 72, pe: 32, roe: 42 },
      { symbol: 'HCL', name: 'HCL Technologies', score: 68, pe: 24, roe: 38 },
      { symbol: 'WIPRO', name: 'Wipro Limited', score: 65, pe: 20, roe: 35 },
      { symbol: 'KPITTECH', name: 'KPIT Technologies', score: 70, pe: 18, roe: 40 },
    ];
    setStocks(mockStocks);
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Stock Scanner</h1>
      </header>

      <section className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Presets</h3>
        <div className={styles.presetGrid}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setSelectedPreset(preset)}
              className={`${styles.presetBtn} ${
                selectedPreset === preset ? styles.active : ''
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.resultsSection}>
        <p className={styles.resultCount}>
          Found {stocks.length} stocks matching &ldquo;{selectedPreset}&rdquo;
        </p>

        {loading ? (
          <div className={styles.loading}>Loading stocks...</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company Name</th>
                  <th>Score</th>
                  <th>P/E</th>
                  <th>ROE %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <tr key={stock.symbol}>
                    <td className={styles.symbol}>
                      <a href={`/stock/${stock.symbol}`}>
                        <strong>{stock.symbol}</strong>
                      </a>
                    </td>
                    <td>{stock.name}</td>
                    <td>
                      <span className={styles.score}>{stock.score}</span>
                    </td>
                    <td>{stock.pe}</td>
                    <td>{stock.roe}%</td>
                    <td className={styles.actions}>
                      <button className={styles.actionBtn}>Track</button>
                      <button className={styles.actionBtn}>Compare</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stocks.length > 0 && (
          <div className={styles.pagination}>
            <button>Previous</button>
            <span>1 2 3 4 5</span>
            <button>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}
