import { useParams } from 'react-router-dom';
import styles from './StockDetail.module.css';
import { useStockDataOptimized } from '../../hooks/useStockDataOptimized';
import { ShareholdingChart } from './ShareholdingChart';
import { FinancialChart } from './FinancialChart';
import PriceChart from './PriceChart';
import { UpgradeBanner } from '../premium/UpgradeBanner';
import { IntelligentAnalysis } from './IntelligentAnalysis';

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const { stock, chart, shareholding, financials, loading, error } =
    useStockDataOptimized(symbol ?? '');

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!stock) return <div className={styles.error}>Stock not found</div>;

  const isPositive = stock.change >= 0;

  return (
    <div className={styles.container}>
      <UpgradeBanner />

      <header className={styles.header}>
        <a href="/" className={styles.backButton}>Back</a>
        <div>
          <h1 className={styles.title}>{stock.symbol}</h1>
        </div>
      </header>

      <main className={styles.main} role="main">
        <section className={styles.priceSection}>
          <div className={styles.price}>
            <span className={styles.amount}>
              Rs {stock.price.toFixed(2)}
            </span>
            <span className={isPositive ? styles.positive : styles.negative}>
              {isPositive ? '+' : ''}{stock.change}%
            </span>
          </div>
        </section>

        <PriceChart symbol={stock.symbol} />

        {shareholding && <ShareholdingChart data={shareholding} />}
        {financials && <FinancialChart data={financials} />}

        <IntelligentAnalysis symbol={stock.symbol} />

        <section className={styles.actionsSection}>
          <button className={styles.btnPrimary}>Track Stock</button>
          <button className={styles.btnSecondary}>Compare</button>
          <button className={styles.btnSecondary}>Invest</button>
        </section>
      </main>
    </div>
  );
}
