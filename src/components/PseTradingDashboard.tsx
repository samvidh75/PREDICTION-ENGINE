import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { pseDataPipeline, type PseDataResult, type PseMarketSummary } from '../services/providers/PseDataPipeline';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } },
};

const flashVariants = {
  initial: { backgroundColor: 'transparent' },
  flashGreen: { backgroundColor: 'rgba(52,199,89,0.15)', transition: { duration: 0.3 } },
  flashRed: { backgroundColor: 'rgba(255,59,48,0.15)', transition: { duration: 0.3 } },
};

function AnimatedPrice({ price, previousPrice }: { price: number; previousPrice: number }) {
  const [flash, setFlash] = useState<'green' | 'red' | null>(null);

  useEffect(() => {
    if (price > previousPrice) setFlash('green');
    else if (price < previousPrice) setFlash('red');
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [price]);

  return (
    <motion.span
      animate={flash ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.3 }}
      style={{
        display: 'inline-block',
        padding: flash === 'green' ? '2px 6px' : flash === 'red' ? '2px 6px' : '2px 0',
        borderRadius: '4px',
        background: flash === 'green' ? 'rgba(52,199,89,0.15)' : flash === 'red' ? 'rgba(255,59,48,0.15)' : 'transparent',
      }}
    >
      ₱{price.toFixed(2)}
    </motion.span>
  );
}

function StockRow({ stock, index }: { stock: PseDataResult; index: number }) {
  const isPositive = stock.changePercent >= 0;
  const color = isPositive ? '#34C759' : '#FF3B30';

  return (
    <motion.tr
      variants={itemVariants}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', width: '40px' }}>{index + 1}</td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px' }}>{stock.symbol}</div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{stock.name}</div>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'SF Mono, monospace', fontSize: '13px' }}>
        <AnimatedPrice price={stock.price} previousPrice={stock.price - stock.change} />
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <motion.span
          style={{ color, fontSize: '12px', fontFamily: 'SF Mono, monospace' }}
          animate={isPositive ? { x: [0, 2, 0] } : { x: [0, -2, 0] }}
          transition={{ duration: 0.3 }}
        >
          {isPositive ? '+' : ''}{stock.change.toFixed(2)}
        </motion.span>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <motion.span
          style={{
            color,
            fontSize: '12px',
            fontFamily: 'SF Mono, monospace',
            padding: '2px 8px',
            borderRadius: '4px',
            background: isPositive ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)',
          }}
        >
          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </motion.span>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'SF Mono, monospace' }}>
        {stock.volume.toLocaleString()}
      </td>
    </motion.tr>
  );
}

function MarketOverviewPanel({ summary }: { summary: PseMarketSummary | null }) {
  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}
    >
      <MetricCard label="PSEi" value={summary.index.psei.toFixed(2)} change={summary.index.pseiChangePercent} />
      <MetricCard label="Advancers" value={summary.advancers.toString()} color="#34C759" />
      <MetricCard label="Decliners" value={summary.decliners.toString()} color="#FF3B30" />
      <MetricCard label="Unchanged" value={summary.unchanged.toString()} color="#FF9500" />
      <MetricCard label="Volume" value={(summary.volume / 1000000).toFixed(2) + 'M'} />
      <MetricCard label="Value" value={'₱' + (summary.value / 1000000000).toFixed(2) + 'B'} />
    </motion.div>
  );
}

function MetricCard({ label, value, change, color }: { label: string; value: string; change?: number; color?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: color || 'white' }}>{value}</div>
      {change !== undefined && (
        <div style={{ fontSize: '11px', color: change >= 0 ? '#34C759' : '#FF3B30', marginTop: '4px' }}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </div>
      )}
    </motion.div>
  );
}

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '3px' }}>
      {tabs.map(tab => (
        <motion.button
          key={tab}
          onClick={() => onChange(tab)}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1,
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: active === tab ? 600 : 400,
            color: active === tab ? 'white' : 'rgba(255,255,255,0.5)',
            background: active === tab ? 'rgba(255,107,74,0.2)' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {tab}
        </motion.button>
      ))}
    </div>
  );
}

function PseTradingDashboard() {
  const [stocks, setStocks] = useState<PseDataResult[]>([]);
  const [summary, setSummary] = useState<PseMarketSummary | null>(null);
  const [activeTab, setActiveTab] = useState('All Stocks');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [stockData, marketSummary] = await Promise.all([
        pseDataPipeline.getAllSectors(),
        pseDataPipeline.getMarketSummary(),
      ]);
      setStocks(stockData['All'] || []);
      setSummary(marketSummary);
    } catch (e) {
      console.error('Failed to fetch PSE data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, []);

  const filtered = stocks.filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = ['All Stocks', 'Gainers', 'Losers', 'Most Active'];

  const getDisplayStocks = async (tab: string) => {
    setLoading(true);
    try {
      let result: PseDataResult[];
      switch (tab) {
        case 'Gainers': result = await pseDataPipeline.getTopGainers(50); break;
        case 'Losers': result = await pseDataPipeline.getTopLosers(50); break;
        case 'Most Active': result = await pseDataPipeline.getMostActive(50); break;
        default: result = (await pseDataPipeline.getAllSectors())['All'] || []; break;
      }
      setStocks(result);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'All Stocks') getDisplayStocks(tab);
    else fetchData();
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <motion.div variants={itemVariants} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          PSE Trading Dashboard
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: '11px', color: '#34C759', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34C759', display: 'inline-block' }} />
            LIVE
          </motion.span>
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Philippine Stock Exchange — Real-time data from PHISIX & Yahoo Finance
        </p>
      </motion.div>

      <MarketOverviewPanel summary={summary} />

      <motion.div variants={itemVariants} style={{ marginBottom: '16px' }}>
        <TabBar tabs={tabs} active={activeTab} onChange={handleTabChange} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search PSE stocks by symbol or name..."
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            color: 'white',
            outline: 'none',
            marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />
      </motion.div>

      {loading ? (
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}
        >
          Loading PSE market data...
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                {['#', 'Symbol', 'Price', 'Change', 'Change %', 'Volume'].map(h => (
                  <th key={h} style={{ padding: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: h === 'Price' || h === 'Change' || h === 'Change %' || h === 'Volume' ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((stock, i) => (
                  <StockRow key={stock.symbol} stock={stock} index={i} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
              No stocks found for "{search}"
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default PseTradingDashboard;
