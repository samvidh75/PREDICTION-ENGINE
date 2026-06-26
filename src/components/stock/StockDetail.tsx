import { useParams } from 'react-router-dom';
import { useStockDataOptimized } from '../../hooks/useStockDataOptimized';
import { ShareholdingChart } from './ShareholdingChart';
import { FinancialChart } from './FinancialChart';
import PriceChart from './PriceChart';
import { IntelligentAnalysis } from './IntelligentAnalysis';
import { PriceHeader } from './PriceHeader';
import { BrokerConnectionBanner } from './BrokerConnectionBanner';
import { LiquidScoreDisplay } from './LiquidScoreDisplay';
import { FundamentalScoreBadge } from './FundamentalScoreBadge';
import { AskAdvisoryButton } from './AskAdvisoryButton';
import { PerformanceSection } from './PerformanceSection';
import { FactorScoreCards } from './FactorScoreCards';
import { TabNavigation } from './TabNavigation';
import { PriceChartAdvanced } from './PriceChartAdvanced';
import { BottomNav } from '../BottomNav';

const PAGE_BG = '#FFFFFF';
const S = { background: PAGE_BG, minHeight: '100vh', paddingBottom: 80 };

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const { stock, chart, shareholding, financials, loading, error } =
    useStockDataOptimized(symbol ?? '');

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999', background: PAGE_BG, minHeight: '100vh' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#DC2626', background: PAGE_BG, minHeight: '100vh' }}>Error: {error}</div>;
  if (!stock) return <div style={{ padding: 40, textAlign: 'center', color: '#999', background: PAGE_BG, minHeight: '100vh' }}>Stock not found</div>;

  return (
    <div style={S}>
      <PriceHeader
        symbol={stock.symbol}
        name={stock.symbol}
        price={stock.price}
        change={stock.change}
        changePercent={stock.change}
        timestamp={new Date().toLocaleString('en-IN')}
        exchange="NSE"
      />

      <TabNavigation />

      <BrokerConnectionBanner />

      <LiquidScoreDisplay
        qualityScore={Math.min(10, Math.max(1, stock.price > 0 ? 6.5 + (stock.change / 100) : 5))}
        riskScore={Math.min(10, Math.max(1, 7 - (stock.change / 100)))}
      />

      <FundamentalScoreBadge score={72} label="Strong" />

      <FactorScoreCards />

      <AskAdvisoryButton symbol={stock.symbol} />

      <div style={{ margin: '16px 20px' }}>
        <PriceChartAdvanced symbol={stock.symbol} prices={chart?.prices} timestamps={chart?.timestamps} />
      </div>

      <div style={{ margin: '16px 20px' }}>
        {shareholding && <ShareholdingChart data={shareholding} />}
      </div>

      <div style={{ margin: '16px 20px' }}>
        {financials && <FinancialChart data={financials} />}
      </div>

      <div style={{ margin: '16px 20px' }}>
        <IntelligentAnalysis symbol={stock.symbol} />
      </div>

      <PerformanceSection />

      <div style={{ display: 'flex', gap: 12, margin: '20px', justifyContent: 'center' }}>
        <button style={{ flex: 1, padding: '12px 20px', background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Track Stock</button>
        <button style={{ padding: '12px 20px', background: '#FFFFFF', color: '#666', border: '1px solid #E5E5E5', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Compare</button>
        <button style={{ padding: '12px 20px', background: '#FFFFFF', color: '#666', border: '1px solid #E5E5E5', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Invest</button>
      </div>

      <BottomNav />
    </div>
  );
}
