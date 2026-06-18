import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PortfolioSnapshotFactory } from '../services/portfolio/PortfolioSnapshotFactory';
import { PortfolioEngine, SECTOR_UNAVAILABLE, normalizeUserHolding, type UserHolding } from '../services/portfolio/PortfolioEngine';
import { buildPortfolioReview } from '../services/portfolio/PortfolioReviewEngine';
import { navigateToStock } from '../architecture/navigation/routeCoordinator';
import { loadAuthSession } from '../services/auth/sessionStore';
import { AlertCircle, ArrowLeftRight, Edit2, Plus, ShieldAlert, Trash2, Upload, X } from 'lucide-react';
import { useLiveQuotes } from '../hooks/useLiveQuotes';
import { formatINR as uiFormatINR } from '../services/ui/dataFormatting';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/feedback/useToast';
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, productNavigate } from '../components/product/ProductUI';

function statusClass(status: 'real' | 'partial' | 'unavailable'): string {
  if (status === 'real') return 'text-[#16A34A]';
  if (status === 'partial') return 'text-[#F59E0B]';
  return 'text-[#64748B]';
}

function reviewSeverityClass(severity: 'info' | 'review' | 'attention'): string {
  if (severity === 'attention') return 'border-[#EF4444]/30 bg-[rgba(239,68,68,0.06)] text-[#EF4444]';
  if (severity === 'review') return 'border-[#F59E0B]/30 bg-[rgba(245,158,11,0.06)] text-[#F59E0B]';
  return 'border-[#16A34A]/30 bg-[rgba(22,163,74,0.06)] text-[#16A34A]';
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
  const authSession = loadAuthSession();
  const isLocalOnly = !authSession.uid;
  const [deleteConfirmSymbol, setDeleteConfirmSymbol] = useState<string | null>(null);
  const toast = useToast();

  const refreshSnapshot = useCallback(() => setSnapshot(PortfolioSnapshotFactory.createSnapshot()), []);
  useEffect(() => { window.addEventListener('portfoliochange', refreshSnapshot); return () => window.removeEventListener('portfoliochange', refreshSnapshot); }, [refreshSnapshot]);

  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    for (const holding of snapshot.holdings) {
      const value = liveQuotes[holding.symbol]?.quote?.price;
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) prices[holding.symbol] = value;
    }
    return prices;
  }, [liveQuotes, snapshot.holdings]);

  const review = useMemo(() => buildPortfolioReview(snapshot.holdings, currentPrices), [currentPrices, snapshot.holdings]);

  const resetHoldingForm = () => { setSymbol(''); setShares(''); setPrice(''); setSector(''); setFormError(''); };

  const handleAddHolding = (event: React.FormEvent) => {
    event.preventDefault(); setFormError('');
    const added = PortfolioEngine.addHolding({ symbol: symbol.toUpperCase().trim(), shares: Number(shares), avgBuyPrice: Number(price), sector });
    if (!added) { setFormError('Ticker, shares and average buy price must be valid positive values.'); return; }
    resetHoldingForm(); setIsAddOpen(false);
  };

  const handleEditHolding = (event: React.FormEvent) => {
    event.preventDefault(); if (!editingHolding) return; setFormError('');
    const updated = PortfolioEngine.updateHolding(editingHolding.symbol, Number(shares), Number(price));
    if (!updated) { setFormError('Shares and average buy price must be valid positive values.'); return; }
    setEditingHolding(null); setShares(''); setPrice('');
  };

  const handleCSVImport = (event: React.FormEvent) => {
    event.preventDefault(); setImportError(''); const lines = csvText.split('\n'); const parsed: UserHolding[] = [];
    for (let index = 0; index < lines.length; index++) {
      const raw = lines[index].trim(); if (!raw) continue; const parts = raw.split(',');
      if (parts.length < 3) { setImportError(`Row ${index + 1}: expected TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]`); return; }
      const normalized = normalizeUserHolding({ symbol: parts[0].trim().toUpperCase(), shares: Number(parts[1].trim()), avgBuyPrice: Number(parts[2].trim()), sector: parts[3]?.trim() || SECTOR_UNAVAILABLE });
      if (!normalized) { setImportError(`Row ${index + 1}: ticker, shares and average buy price must be valid positive values`); return; }
      parsed.push(normalized);
    }
    if (parsed.length === 0) { setImportError('No valid rows found.'); return; }
    parsed.forEach((holding) => PortfolioEngine.addHolding(holding)); setIsImportOpen(false); setCsvText('');
  };

  const handleOpenStock = (ticker: string) => navigateToStock({ ticker, mode: "push" });
  const largest = review.concentration.largestPosition;

  return (
    <ProductShell>
      <ProductPage>
        <ProductPanel className="p-5 sm:p-6" as="section" aria-label="Portfolio overview">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Tracked thesis</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#E6EDF3]">Monitoring your thesis</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[#9AA7B5]">
                Manual tracking. No broker connection.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProductAction variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Add position</ProductAction>
              <ProductAction variant="secondary" onClick={() => setIsImportOpen(true)}><Upload className="h-3.5 w-3.5" /> Import CSV</ProductAction>
              <ProductAction variant="ghost" onClick={() => productNavigate("trust")}>Trust Centre</ProductAction>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Entry price", value: review.totalCostBasis > 0 ? uiFormatINR(review.totalCostBasis) : 'Not enough information' },
              { label: "Current value", value: review.livePortfolioValue === null ? 'Not enough information' : uiFormatINR(review.livePortfolioValue) },
              { label: "Price status", value: `${review.quoteCoverage.coveredPositions}/${review.quoteCoverage.totalPositions}`, detail: `${review.quoteCoverage.coveragePct.toFixed(0)}% of holdings` },
              { label: "Largest position", value: largest ? largest.symbol : 'Not enough information', detail: largest ? `${largest.weightPct.toFixed(2)}% of entry price` : undefined },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">{item.label}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-[#E6EDF3]">{item.value}</div>
                {item.detail && <div className="mt-0.5 text-[10px] text-[#64748B]">{item.detail}</div>}
              </div>
            ))}
          </div>
        </ProductPanel>

        {isAddOpen && (
          <ProductPanel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[#E6EDF3]">Add position</div>
                <p className="text-xs text-[#9AA7B5]">Record a manual holding for research tracking.</p>
              </div>
              <button type="button" onClick={() => { setIsAddOpen(false); resetHoldingForm(); }} className="text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddHolding} className="space-y-3">
              <input aria-label="Ticker" type="text" required placeholder="Ticker" value={symbol} onChange={(event) => setSymbol(event.target.value)} className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" />
              <div className="grid grid-cols-2 gap-3">
                <input aria-label="Shares" type="number" min="0.000001" step="any" required placeholder="Shares" value={shares} onChange={(event) => setShares(event.target.value)} className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" />
                <input aria-label="Average buy price" type="number" min="0.000001" step="any" required placeholder="Avg Buy Price" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" />
              </div>
              <input aria-label="Sector optional" type="text" placeholder="Sector (optional)" value={sector} onChange={(event) => setSector(event.target.value)} className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" />
              {formError && <div className="rounded-lg border border-[#EF4444]/20 bg-[rgba(239,68,68,0.06)] p-2.5 text-[10px] text-[#EF4444]">{formError}</div>}
              <button type="submit" className="w-full rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3B71FF]">Save holding</button>
            </form>
          </ProductPanel>
        )}

        {editingHolding !== null && (
          <ProductPanel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[#E6EDF3]">Edit {editingHolding.symbol}</div>
                <p className="text-xs text-[#9AA7B5]">Update shares or average buy price.</p>
              </div>
              <button type="button" onClick={() => { setEditingHolding(null); setFormError(''); }} className="text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEditHolding} className="space-y-3">
              <input aria-label="Edit shares" type="number" min="0.000001" step="any" required value={shares} onChange={(event) => setShares(event.target.value)} className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" placeholder="Shares" />
              <input aria-label="Edit average buy price" type="number" min="0.000001" step="any" required value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" placeholder="Avg Buy Price" />
              {formError && <div className="rounded-lg border border-[#EF4444]/20 bg-[rgba(239,68,68,0.06)] p-2.5 text-[10px] text-[#EF4444]">{formError}</div>}
              <button type="submit" className="w-full rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3B71FF]">Save</button>
            </form>
          </ProductPanel>
        )}

        {isImportOpen && (
          <ProductPanel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[#E6EDF3]">Import CSV</div>
                <p className="text-xs text-[#9AA7B5]">TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]</p>
              </div>
              <button type="button" onClick={() => { setIsImportOpen(false); setCsvText(''); }} className="text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCSVImport} className="space-y-3">
              <textarea aria-label="Portfolio CSV" required rows={6} placeholder="TCS,10,3600,IT" value={csvText} onChange={(event) => setCsvText(event.target.value)} className="w-full resize-none rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none focus:border-[#2962FF]/60 transition-colors" />
              <p className="text-[10px] leading-relaxed text-[#64748B]">Format: TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]. Leave sector blank if unknown.</p>
              {importError && <div className="rounded-lg border border-[#EF4444]/20 bg-[rgba(239,68,68,0.06)] p-2.5 text-[10px] text-[#EF4444]">{importError}</div>}
              <button type="submit" className="w-full rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3B71FF]">Parse and import</button>
            </form>
          </ProductPanel>
        )}

        {review.reviewQueue.length > 0 && (
          <section aria-label="Portfolio review queue" className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#E6EDF3]">Review queue</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {review.reviewQueue.map((item) => (
                <button key={item.id} type="button" onClick={() => item.symbol && handleOpenStock(item.symbol)} className={`rounded-lg border p-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)] ${reviewSeverityClass(item.severity)}`}>
                  <div className="text-[11px] font-semibold text-[#E6EDF3]">{item.title}</div>
                  <div className="mt-1 text-[10px] leading-relaxed opacity-75 text-[#9AA7B5]">{item.detail}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {review.concentration.sectorExposure.length > 0 && (
          <ProductPanel className="p-5" as="section" aria-label="Cost basis sector exposure">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#E6EDF3]">Sector exposure - entry price</h2>
            <div className="mt-3 space-y-2">
              {review.concentration.sectorExposure.map((item) => (
                <div key={item.sector} className="flex items-center gap-3 text-[11px]">
                  <span className="w-40 truncate text-[#9AA7B5]">{item.sector}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(148,163,184,0.12)]">
                    <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${Math.min(100, item.weightPct)}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono tabular-nums text-[#E6EDF3]">{item.weightPct.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </ProductPanel>
        )}

        {review.holdings.length === 0 ? (
          <ProductEmptyState
            icon={AlertCircle}
            title="No open positions"
            body="Use the Add position form or CSV import to record research holdings and start tracking data availability."
            action={
              <div className="flex gap-2">
                <ProductAction variant="primary" onClick={() => setIsAddOpen(true)}>Add position</ProductAction>
                <ProductAction variant="ghost" onClick={() => productNavigate("trust")}>Trust Centre</ProductAction>
              </div>
            }
          />
        ) : (
          <ProductPanel className="overflow-hidden" as="section" aria-label="Portfolio holdings">
            <div className="hidden sm:block">
              <div className="grid grid-cols-[1fr_100px_70px_100px_100px_80px_130px] gap-2 border-b border-[rgba(148,163,184,0.12)] p-3 text-[9px] font-bold uppercase tracking-wider text-[#9AA7B5]">
                <span className="pl-3">Ticker</span><span>Sector</span><span>Shares</span><span>Entry price</span><span>Current value</span><span>Return</span><span className="text-right pr-3"></span>
              </div>
              {review.holdings.map((holding) => (
                <div key={holding.symbol} className="grid grid-cols-[1fr_100px_70px_100px_100px_80px_130px] items-center gap-2 border-b border-[rgba(148,163,184,0.06)] p-3 last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <button type="button" onClick={() => handleOpenStock(holding.symbol)} className="cursor-pointer border-none bg-transparent pl-3 text-left font-mono text-sm font-bold text-[#E6EDF3] hover:underline">{holding.symbol}</button>
                  <span className="truncate text-[11px] text-[#9AA7B5]">{holding.sector}</span>
                  <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">{holding.shares}</span>
                  <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">{uiFormatINR(holding.costBasis)}</span>
                  <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">{holding.liveValue === null ? <span className="text-[#64748B]">Not enough information</span> : uiFormatINR(holding.liveValue)}</span>
                  <span className={`font-mono text-xs tabular-nums ${holding.gainLossPct === null ? 'text-[#64748B]' : holding.gainLossPct >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                    {holding.gainLossPct === null ? 'Not enough information' : `${holding.gainLossPct >= 0 ? '+' : ''}${holding.gainLossPct.toFixed(2)}%`}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" aria-label={`Compare ${holding.symbol}`} onClick={() => productNavigate("compare", holding.symbol)} className="cursor-pointer border-none bg-transparent p-1.5 text-[10px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors">
                      <ArrowLeftRight className="h-3 w-3" />
                    </button>
                    <button type="button" aria-label={`Edit ${holding.symbol}`} onClick={() => { setEditingHolding(holding); setShares(String(holding.shares)); setPrice(String(holding.avgBuyPrice)); setFormError(''); }} className="cursor-pointer border-none bg-transparent p-1.5 text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"><Edit2 className="h-3 w-3" /></button>
                    <button type="button" aria-label={`Delete ${holding.symbol}`} onClick={() => setDeleteConfirmSymbol(holding.symbol)} className="cursor-pointer border-none bg-transparent p-1.5 text-[#9AA7B5] hover:text-[#EF4444] transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 sm:hidden p-4">
              {review.holdings.map((holding) => (
                <div key={holding.symbol} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={() => handleOpenStock(holding.symbol)} className="cursor-pointer border-none bg-transparent font-mono text-sm font-bold text-[#E6EDF3] hover:underline">{holding.symbol}</button>
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label={`Compare ${holding.symbol}`} onClick={() => productNavigate("compare", holding.symbol)} className="cursor-pointer border-none bg-transparent p-1 text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"><ArrowLeftRight className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Edit ${holding.symbol}`} onClick={() => { setEditingHolding(holding); setShares(String(holding.shares)); setPrice(String(holding.avgBuyPrice)); setFormError(''); }} className="cursor-pointer border-none bg-transparent p-1 text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Delete ${holding.symbol}`} onClick={() => setDeleteConfirmSymbol(holding.symbol)} className="cursor-pointer border-none bg-transparent p-1 text-[#9AA7B5] hover:text-[#EF4444] transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div><span className="text-[#9AA7B5]">Sector</span><p className="font-medium truncate text-[#E6EDF3]">{holding.sector}</p></div>
                    <div><span className="text-[#9AA7B5]">Shares</span><p className="font-mono font-medium tabular-nums text-[#E6EDF3]">{holding.shares}</p></div>
                    <div><span className="text-[#9AA7B5]">Entry price</span><p className="font-mono font-medium tabular-nums text-[#E6EDF3]">{uiFormatINR(holding.costBasis)}</p></div>
                    <div><span className="text-[#9AA7B5]">Current value</span><p className="font-mono font-medium tabular-nums text-[#E6EDF3]">{holding.liveValue === null ? <span className="text-[#64748B]">Not enough information</span> : uiFormatINR(holding.liveValue)}</p></div>
                    <div className="col-span-2">
                      <span className="text-[#9AA7B5]">Return</span>
                      <p className={`font-mono font-medium tabular-nums ${holding.gainLossPct === null ? 'text-[#64748B]' : holding.gainLossPct >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                        {holding.gainLossPct === null ? 'Not enough information' : `${holding.gainLossPct >= 0 ? '+' : ''}${holding.gainLossPct.toFixed(2)}%`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ProductPanel>
        )}

        <ConfirmDialog
          open={deleteConfirmSymbol !== null}
          title="Remove holding"
          message={`Remove ${deleteConfirmSymbol} from your portfolio? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          destructive={true}
          onConfirm={() => { if (deleteConfirmSymbol) { PortfolioEngine.removeHolding(deleteConfirmSymbol); toast.success(`${deleteConfirmSymbol} removed from portfolio`); setDeleteConfirmSymbol(null); } }}
          onCancel={() => setDeleteConfirmSymbol(null)}
        />
      </ProductPage>
    </ProductShell>
  );
};

export default PortfolioPage;
