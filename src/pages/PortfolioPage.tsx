import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioSnapshotFactory } from '../services/portfolio/PortfolioSnapshotFactory';
import { PortfolioEngine, UserHolding } from '../services/portfolio/PortfolioEngine';
import { Plus, Upload, Trash2, Edit2, X, AlertCircle, ArrowUpRight, ArrowDownRight, ShieldAlert } from 'lucide-react';
import { StockRegistry } from '../services/stocks/StockRegistry';
import { formatINR, useLiveQuotes } from '../hooks/useLiveQuotes';
import { PageHeader, Button } from '../components/ui/DesignSystem';

export const PortfolioPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState(() => PortfolioSnapshotFactory.createSnapshot());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UserHolding | null>(null);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [sector, setSector] = useState('IT');
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const liveQuotes = useLiveQuotes(snapshot.holdings.map(h => h.symbol));

  const refreshSnapshot = useCallback(() => setSnapshot(PortfolioSnapshotFactory.createSnapshot()), []);
  useEffect(() => { window.addEventListener('portfoliochange', refreshSnapshot); return () => window.removeEventListener('portfoliochange', refreshSnapshot); }, [refreshSnapshot]);

  const handleAddHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !price) return;
    PortfolioEngine.addHolding({ symbol: symbol.toUpperCase().trim(), shares: parseFloat(shares), avgBuyPrice: parseFloat(price), sector });
    setSymbol(''); setShares(''); setPrice(''); setIsAddOpen(false);
  };

  const handleEditHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding || !shares || !price) return;
    PortfolioEngine.updateHolding(editingHolding.symbol, parseFloat(shares), parseFloat(price));
    setEditingHolding(null); setShares(''); setPrice('');
  };

  const handleDeleteHolding = (sym: string) => { PortfolioEngine.removeHolding(sym); };
  const handleCSVImport = (e: React.FormEvent) => {
    e.preventDefault(); setImportError('');
    const lines = csvText.split('\n');
    const parsed: UserHolding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].trim().split(',');
      if (!lines[i].trim()) continue;
      if (parts.length < 3) { setImportError(`Row ${i+1}: insufficient columns`); return; }
      const symVal = parts[0].trim().toUpperCase();
      const sharesVal = parseFloat(parts[1].trim());
      const priceVal = parseFloat(parts[2].trim());
      const sectorVal = parts[3]?.trim() || 'Conglomerate';
      if (!symVal || isNaN(sharesVal) || isNaN(priceVal)) { setImportError(`Row ${i+1}: invalid format`); return; }
      parsed.push({ symbol: symVal, shares: sharesVal, avgBuyPrice: priceVal, sector: sectorVal });
    }
    if (parsed.length === 0) { setImportError('No valid rows found'); return; }
    parsed.forEach(h => PortfolioEngine.addHolding(h));
    setIsImportOpen(false); setCsvText('');
  };

  const handleOpenStock = (sym: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'stock'); params.set('id', sym);
    window.history.pushState({}, '', `?${params.toString()}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const calculatedHoldings = useMemo(() => {
    return snapshot.holdings.map(h => {
      const quoteState = liveQuotes[h.symbol];
      const currentPrice = quoteState?.quote?.price ?? null;
      const totalValue = currentPrice === null ? null : h.shares * currentPrice;
      const costBasis = h.shares * h.avgBuyPrice;
      const gainLossPct = totalValue && costBasis > 0 ? ((totalValue - costBasis) / costBasis) * 100 : null;
      return { ...h, currentPrice, totalValue, gainLossPct };
    }).sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0));
  }, [liveQuotes, snapshot.holdings]);

  const totalValue = useMemo(() => calculatedHoldings.reduce((s, h) => s + (h.totalValue ?? 0), 0), [calculatedHoldings]);
  const best = useMemo(() => [...calculatedHoldings].filter(h => h.gainLossPct !== null).sort((a, b) => (b.gainLossPct ?? 0) - (a.gainLossPct ?? 0))[0] || null, [calculatedHoldings]);
  const worst = useMemo(() => [...calculatedHoldings].filter(h => h.gainLossPct !== null).sort((a, b) => (a.gainLossPct ?? 0) - (b.gainLossPct ?? 0))[0] || null, [calculatedHoldings]);
  const largest = calculatedHoldings.length > 0 ? calculatedHoldings[0] : null;

  return (
    <div className="w-full flex flex-col space-y-8 pb-12 text-white min-h-screen font-sans max-w-5xl mx-auto antialiased">
      <PageHeader
        title="Portfolio"
        subtitle="What needs attention?"
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}><Upload className="w-3 h-3 mr-1" /> Import</Button>
          </div>
        }
      />

      {/* TOP ROW: Best / Worst / Largest */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <span className="text-[10px] uppercase text-white/40 block">Best Performer</span>
          {best ? (
            <div className="mt-2">
              <span className="text-sm font-bold text-white">{best.symbol}</span>
              <span className="text-xs font-mono text-emerald-400 ml-2">+{best.gainLossPct?.toFixed(1)}%</span>
            </div>
          ) : <span className="text-sm text-white/30 mt-2 block">—</span>}
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <span className="text-[10px] uppercase text-white/40 block">Worst Performer</span>
          {worst ? (
            <div className="mt-2">
              <span className="text-sm font-bold text-white">{worst.symbol}</span>
              <span className="text-xs font-mono text-rose-400 ml-2">{worst.gainLossPct?.toFixed(1)}%</span>
            </div>
          ) : <span className="text-sm text-white/30 mt-2 block">—</span>}
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <span className="text-[10px] uppercase text-white/40 block">Largest Position</span>
          {largest ? (
            <div className="mt-2">
              <span className="text-sm font-bold text-white">{largest.symbol}</span>
              <span className="text-xs text-white/50 ml-2">{largest.totalValue ? formatINR(largest.totalValue) : '—'}</span>
            </div>
          ) : <span className="text-sm text-white/30 mt-2 block">—</span>}
        </div>
      </div>

      {/* HOLDINGS TABLE */}
      {calculatedHoldings.length === 0 ? (
        <div className="p-8 text-center text-sm text-white/30">No holdings added yet.</div>
      ) : (
        <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px_80px_120px] gap-2 p-3 text-[10px] uppercase text-white/40 font-bold tracking-wider border-b border-white/5">
            <span className="pl-3">Ticker</span>
            <span>Shares</span>
            <span>Value</span>
            <span>Return</span>
            <span className="text-right pr-3">Actions</span>
          </div>
          {calculatedHoldings.map(h => (
            <div key={h.symbol} className="grid grid-cols-[1fr_80px_100px_80px_120px] gap-2 p-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] items-center">
              <button onClick={() => handleOpenStock(h.symbol)} className="text-left font-mono font-bold text-white hover:text-cyan-400 cursor-pointer bg-transparent border-none pl-3">{h.symbol}</button>
              <span className="font-mono text-xs text-white/70">{h.shares}</span>
              <span className="font-mono text-xs text-white/70">{h.totalValue ? formatINR(h.totalValue) : '—'}</span>
              <span className={`font-mono text-xs ${h.gainLossPct !== null && h.gainLossPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {h.gainLossPct !== null ? `${h.gainLossPct >= 0 ? '+' : ''}${h.gainLossPct.toFixed(1)}%` : '—'}
              </span>
              <div className="flex items-center justify-end gap-1 pr-2">
                <button onClick={() => { setEditingHolding(h); setShares(h.shares.toString()); setPrice(h.avgBuyPrice.toString()); }} className="p-1.5 text-white/40 hover:text-white/70 cursor-pointer bg-transparent border-none"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => handleDeleteHolding(h.symbol)} className="p-1.5 text-white/40 hover:text-rose-400 cursor-pointer bg-transparent border-none"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0e14] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-cyan-400">Add Holding</h3><button onClick={() => setIsAddOpen(false)} className="text-white/45 hover:text-white"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleAddHolding} className="space-y-3">
              <input type="text" required placeholder="Ticker" value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" required placeholder="Shares" value={shares} onChange={e => setShares(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono" />
                <input type="number" required placeholder="Avg Buy Price" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono" />
              </div>
              <button type="submit" className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300">Add Asset</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingHolding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0e14] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-cyan-400">Edit {editingHolding.symbol}</h3><button onClick={() => setEditingHolding(null)} className="text-white/45 hover:text-white"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleEditHolding} className="space-y-3">
              <input type="number" required value={shares} onChange={e => setShares(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono" placeholder="Shares" />
              <input type="number" required value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono" placeholder="Avg Buy Price" />
              <button type="submit" className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300">Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0e14] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-cyan-400">Import CSV</h3><button onClick={() => setIsImportOpen(false)} className="text-white/45 hover:text-white"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleCSVImport} className="space-y-3">
              <textarea required rows={6} placeholder="TCS,10,3600,IT" value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono resize-none" />
              {importError && <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[10px]">{importError}</div>}
              <button type="submit" className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300">Parse & Import</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
