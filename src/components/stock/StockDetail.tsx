import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './StockDetail.module.css';

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbol) {
      setStock({
        symbol: symbol.toUpperCase(),
        name: symbol?.toUpperCase() === 'TCS' ? 'TATA Consultancy Services' : `${symbol?.toUpperCase()} Limited`,
        price: 3700.50,
        change: 2.3,
        volume: 2500000,
        score: 75,
        conviction: 'High Conviction',
        metrics: { pe: 28, pb: 4.2, roe: 46, dividend: 2 },
        factors: { quality: 72, valuation: 45, growth: 68, risk: 75 },
        news: [
          'Q1 results beat estimates',
          'Analyst upgrades rating to BUY',
        ],
      });
      setLoading(false);
    }
  }, [symbol]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!stock) return <div className={styles.error}>Stock not found</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <a href="/" className={styles.backButton}>Back</a>
        <div>
          <h1 className={styles.title}>{stock.symbol}</h1>
          <p className={styles.subtitle}>{stock.name}</p>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.priceSection}>
          <div className={styles.price}>
            <span className={styles.amount}>Rs {stock.price.toFixed(2)}</span>
            <span className={stock.change >= 0 ? styles.positive : styles.negative}>
              {stock.change >= 0 ? '+' : ''}{stock.change}%
            </span>
          </div>
          <p className={styles.volume}>Volume: {stock.volume.toLocaleString()}</p>
        </section>

        <section className={styles.scoreSection}>
          <ScoreRing score={stock.score} />
          <div className={styles.scoreInfo}>
            <p className={styles.scoreLabel}>{stock.conviction}</p>
          </div>
        </section>

        <section className={styles.metricsSection}>
          <h2 className={styles.sectionTitle}>Financial Metrics</h2>
          <div className={styles.metricsGrid}>
            <MetricCard label="P/E Ratio" value={stock.metrics.pe} />
            <MetricCard label="P/B Ratio" value={stock.metrics.pb} />
            <MetricCard label="ROE %" value={stock.metrics.roe} />
            <MetricCard label="Dividend %" value={stock.metrics.dividend} />
          </div>
        </section>

        <section className={styles.factorsSection}>
          <h2 className={styles.sectionTitle}>Analysis Factors</h2>
          <div className={styles.factorsList}>
            <FactorBar label="Quality" value={stock.factors.quality} />
            <FactorBar label="Valuation" value={stock.factors.valuation} />
            <FactorBar label="Growth" value={stock.factors.growth} />
            <FactorBar label="Risk" value={stock.factors.risk} />
          </div>
        </section>

        <section className={styles.actionsSection}>
          <button className={styles.btnPrimary}>Track Stock</button>
          <button className={styles.btnSecondary}>Compare</button>
          <button className={styles.btnSecondary}>Invest</button>
        </section>

        <section className={styles.newsSection}>
          <h2 className={styles.sectionTitle}>Recent News</h2>
          <div className={styles.newsList}>
            {stock.news.map((item: string, idx: number) => (
              <div key={idx} className={styles.newsItem}>
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg className={styles.scoreRing} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" className={styles.scoreRingBg} />
      <circle
        cx="50"
        cy="50"
        r="45"
        className={styles.scoreRingProgress}
        style={{ strokeDashoffset: offset }}
      />
      <text x="50" y="55" className={styles.scoreText}>
        {score}
      </text>
    </svg>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metricCard}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.factorBar}>
      <p className={styles.factorLabel}>{label}</p>
      <div className={styles.factorBarContainer}>
        <div
          className={styles.factorBarFill}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className={styles.factorValue}>{value}%</p>
    </div>
  );
}
