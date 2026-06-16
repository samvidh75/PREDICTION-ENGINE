import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PortfolioSnapshotFactory } from '../services/portfolio/PortfolioSnapshotFactory';
import { PortfolioEngine, SECTOR_UNAVAILABLE, normalizeUserHolding, type UserHolding } from '../services/portfolio/PortfolioEngine';
import { buildPortfolioReview } from '../services/portfolio/PortfolioReviewEngine';
import { AlertCircle, Edit2, Plus, ShieldAlert, Trash2, Upload, X } from 'lucide-react';
import { formatINR, useLiveQuotes } from '../hooks/useLiveQuotes';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/DataState';
import tokens from '../components/ui/tokens';

function statusClass(status: 'real' | 'partial' | 'unavailable'): string {
  if (status === 'real') return 'text-emerald-700';
  if (status === 'partial') return 'text-amber-700';
  return 'text-slate-500';
}

function reviewSeverityClass(severity: 'info' | 'review' | 'attention'): string {
  if (severity === 'attention') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (severity === 'review') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export const PortfolioPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState(() => PortfolioSnapshotFactory.createSnapshot());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UserHolding | null>(null);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [sector, setSector] = useState('');
  const [csvText, setCsvText] = useState('');
  const [formError, setFormError] = useState('');
  const [importError, setImportError] = useState('');
  const liveQuotes = useLiveQuotes(snapshot.holdings.map((holding) => holding.symbol));

  const refreshSnapshot = useCallback(() => setSnapshot(PortfolioSnapshotFactory.createSnapshot()), []);
  useEffect(() => {
    window.addEventListener('portfoliochange', refreshSnapshot);
    return () => window.removeEventListener('portfoliochange', refreshSnapshot);
  }, [refreshSnapshot]);

  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    for (const holding of snapshot.holdings) {
      const value = liveQuotes[holding.symbol]?.quote?.price;
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) prices[holding.symbol] = value;
    }
    return prices;
  }, [liveQuotes, snapshot.holdings]);

  const review = useMemo(() => buildPortfolioReview(snapshot.holdings, currentPrices), [currentPrices, snapshot.holdings]);

  const resetHoldingForm = () => {
    setSymbol('');
    setShares('');
    setPrice('');
    setSector('');
    setFormError('');
  };

  const handleAddHolding = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const added = PortfolioEngine.addHolding({
      symbol: symbol.toUpperCase().trim(),
      shares: Number(shares),
      avgBuyPrice: Number(price),
      sector,
    });
    if (!added) {
      setFormError('Ticker, shares and average buy price must be valid positive values.');
      return;
    }
    resetHoldingForm();
    setIsAddOpen(false);
  };

  const handleEditHolding = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingHolding) return;
    setFormError('');
    const updated = PortfolioEngine.updateHolding(editingHolding.symbol, Number(shares), Number(price));
    if (!updated) {
      setFormError('Shares and average buy price must be valid positive values.');
      return;
    }
    setEditingHolding(null);
    setShares('');
    setPrice('');
  };

  const handleCSVImport = (event: React.FormEvent) => {
    event.preventDefault();
    setImportError('');
    const lines = csvText.split('\n');
    const parsed: UserHolding[] = [];
    for (let index = 0; index < lines.length; index++) {
      const raw = lines[index].trim();
      if (!raw) continue;
      const parts = raw.split(',');
      if (parts.length < 3) {
        setImportError(`Row ${index + 1}: expected TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]`);
        return;
      }
      const normalized = normalizeUserHolding({
        symbol: parts[0].trim().toUpperCase(),
        shares: Number(parts[1].trim()),
        avgBuyPrice: Number(parts[2].trim()),
        sector: parts[3]?.trim() || SECTOR_UNAVAILABLE,
      });
      if (!normalized) {
        setImportError(`Row ${index + 1}: ticker, shares and average buy price must be valid positive values`);
        return;
      }
      parsed.push(normalized);
    }
    if (parsed.length === 0) {
      setImportError('No valid rows found.');
      return;
    }
    parsed.forEach((holding) => PortfolioEngine.addHolding(holding));
    setIsImportOpen(false);
    setCsvText('');
  };

  const handleOpenStock = (ticker: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'stock');
    params.set('id', ticker);
    params.delete('symbol');
    window.history.pushState({}, '', `?${params.toString()}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const largest = review.concentration.largestPosition;

  return (
    <div className={`${tokens.layout.container} flex flex-col space-y-8`}>
      <PageHeader
        title="Portfolio"
        subtitle="Recorded holdings, source-backed quotes and review queues"
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="mr-1 h-3 w-3" /> Add</Button>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}><Upload className="mr-1 h-3 w-3" /> Import</Button>
          </div>
        }
      />

      <section aria-label="Portfolio operating summary" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-950">Portfolio operating summary</h2>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-500">
              Concentration uses recorded cost basis. Live portfolio value and returns remain unavailable until every holding has a source-backed quote.
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${statusClass(review.availability)}`}>{review.availability}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Recorded cost basis" value={review.totalCostBasis > 0 ? formatINR(review.totalCostBasis) : 'Data unavailable'} />
          <SummaryCard label="Live portfolio value" value={review.livePortfolioValue === null ? 'Data unavailable' : formatINR(review.livePortfolioValue)} />
          <SummaryCard label="Quote coverage" value={`${review.quoteCoverage.coveredPositions}/${review.quoteCoverage.totalPositions}`} detail={`${review.quoteCoverage.coveragePct.toFixed(0)}% of holdings`} />
          <SummaryCard label="Largest position" value={largest ? largest.symbol : 'Data unavailable'} detail={largest ? `${largest.weightPct.toFixed(2)}% of cost basis` : undefined} />
        </div>

        {review.quoteCoverage.missingSymbols.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Missing live quotes: {review.quoteCoverage.missingSymbols.join(', ')}. Market value and portfolio return are intentionally withheld.
          </div>
        )}
      </section>

      {review.reviewQueue.length > 0 && (
        <section aria-label="Portfolio review queue" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-950">Review queue</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {review.reviewQueue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => item.symbol && handleOpenStock(item.symbol)}
                className={`rounded-lg border p-3 text-left transition-colors hover:bg-white ${reviewSeverityClass(item.severity)}`}
              >
                <div className="text-[11px] font-semibold">{item.title}</div>
                <div className="mt-1 text-[10px] leading-relaxed opacity-75">{item.detail}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {review.concentration.sectorExposure.length > 0 && (
        <section aria-label="Cost basis sector exposure" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-950">Sector exposure - recorded cost basis</h2>
          <div className="mt-3 space-y-2">
            {review.concentration.sectorExposure.map((item) => (
              <div key={item.sector} className="flex items-center gap-3 text-[11px]">
                <span className="w-40 truncate text-slate-600">{item.sector}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.min(100, item.weightPct)}%` }} />
                </div>
                <span className="w-16 text-right font-mono text-slate-700">{item.weightPct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {review.holdings.length === 0 ? (
        <EmptyState
          title="No holdings added yet"
          description="Recorded portfolio holdings act as a saved research space. Add holdings here to track cost basis and exposure metrics. Live valuations and returns appear only when every holding has verified market pricing."
        />
      ) : (
        <section aria-label="Portfolio holdings" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_130px_72px_110px_110px_82px_72px] gap-2 border-b border-slate-200 bg-slate-50 p-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            <span className="pl-3">Ticker</span><span>Sector</span><span>Shares</span><span>Cost basis</span><span>Live value</span><span>Return</span><span className="text-right pr-3">Actions</span>
          </div>
          {review.holdings.map((holding) => (
            <div key={holding.symbol} className="grid grid-cols-[1fr_130px_72px_110px_110px_82px_72px] items-center gap-2 border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50">
              <button type="button" onClick={() => handleOpenStock(holding.symbol)} className="cursor-pointer border-none bg-transparent pl-3 text-left font-mono font-bold text-slate-950 hover:text-emerald-800">{holding.symbol}</button>
              <span className="truncate text-[11px] text-slate-500">{holding.sector}</span>
              <span className="font-mono text-xs text-slate-700">{holding.shares}</span>
              <span className="font-mono text-xs text-slate-700">{formatINR(holding.costBasis)}</span>
              <span className="font-mono text-xs text-slate-700">{holding.liveValue === null ? 'Unavailable' : formatINR(holding.liveValue)}</span>
              <span className={`font-mono text-xs ${holding.gainLossPct === null ? 'text-slate-500' : holding.gainLossPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {holding.gainLossPct === null ? 'Unavailable' : `${holding.gainLossPct >= 0 ? '+' : ''}${holding.gainLossPct.toFixed(2)}%`}
              </span>
              <div className="flex items-center justify-end gap-1 pr-2">
                <button type="button" aria-label={`Edit ${holding.symbol}`} onClick={() => { setEditingHolding(holding); setShares(String(holding.shares)); setPrice(String(holding.avgBuyPrice)); setFormError(''); }} className="cursor-pointer border-none bg-transparent p-1.5 text-slate-500 hover:text-slate-800"><Edit2 className="h-3 w-3" /></button>
                <button type="button" aria-label={`Delete ${holding.symbol}`} onClick={() => PortfolioEngine.removeHolding(holding.symbol)} className="cursor-pointer border-none bg-transparent p-1.5 text-slate-500 hover:text-rose-700"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </section>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-950">Add holding</h3><button type="button" onClick={() => { setIsAddOpen(false); resetHoldingForm(); }} className="text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleAddHolding} className="space-y-3">
              <input aria-label="Ticker" type="text" required placeholder="Ticker" value={symbol} onChange={(event) => setSymbol(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900" />
              <div className="grid grid-cols-2 gap-3">
                <input aria-label="Shares" type="number" min="0.000001" step="any" required placeholder="Shares" value={shares} onChange={(event) => setShares(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900" />
                <input aria-label="Average buy price" type="number" min="0.000001" step="any" required placeholder="Avg Buy Price" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900" />
              </div>
              <input aria-label="Sector optional" type="text" placeholder="Sector (optional)" value={sector} onChange={(event) => setSector(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900" />
              {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[10px] text-rose-700">{formError}</div>}
              <Button type="submit" className="w-full text-xs">Add asset</Button>
            </form>
          </div>
        </div>
      )}

      {editingHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-950">Edit {editingHolding.symbol}</h3><button type="button" onClick={() => { setEditingHolding(null); setFormError(''); }} className="text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleEditHolding} className="space-y-3">
              <input aria-label="Edit shares" type="number" min="0.000001" step="any" required value={shares} onChange={(event) => setShares(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900" placeholder="Shares" />
              <input aria-label="Edit average buy price" type="number" min="0.000001" step="any" required value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900" placeholder="Avg Buy Price" />
              {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[10px] text-rose-700">{formError}</div>}
              <Button type="submit" className="w-full text-xs">Save</Button>
            </form>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-950">Import CSV</h3><button type="button" onClick={() => setIsImportOpen(false)} className="text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleCSVImport} className="space-y-3">
              <textarea aria-label="Portfolio CSV" required rows={6} placeholder="TCS,10,3600,IT" value={csvText} onChange={(event) => setCsvText(event.target.value)} className="w-full resize-none rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900" />
              <p className="text-[10px] leading-relaxed text-slate-500">Format: TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]. Missing sectors remain explicitly unavailable.</p>
              {importError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[10px] text-rose-700">{importError}</div>}
              <Button type="submit" className="w-full text-xs">Parse and import</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
      {detail && <div className="mt-1 text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
}

export default PortfolioPage;
