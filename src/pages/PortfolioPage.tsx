import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PortfolioSnapshotFactory } from '../services/portfolio/PortfolioSnapshotFactory';
import { PortfolioEngine, SECTOR_UNAVAILABLE, normalizeUserHolding, type UserHolding } from '../services/portfolio/PortfolioEngine';
import { buildPortfolioReview } from '../services/portfolio/PortfolioReviewEngine';
import { navigateToStock } from '../architecture/navigation/routeCoordinator';
import { loadAuthSession } from '../services/auth/sessionStore';
import { AlertCircle, Edit2, Plus, ShieldAlert, Trash2, Upload, X } from 'lucide-react';
import { useLiveQuotes } from '../hooks/useLiveQuotes';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/DataState';
import { formatINR as uiFormatINR } from '../services/ui/dataFormatting';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/feedback/useToast';
import { SpatialSheet } from '../components/intelligence/SpatialSheet';
import { AppScreen, MobilePageHeader, ResearchEmptyState, SourceAuditCard } from '../components/premium/PremiumUI';

function statusClass(status: 'real' | 'partial' | 'unavailable'): string {
  if (status === 'real') return 'text-[#22AB94]';
  if (status === 'partial') return 'text-[#EF9A09]';
  return 'text-[#8B949E]';
}

function reviewSeverityClass(severity: 'info' | 'review' | 'attention'): string {
  if (severity === 'attention') return 'border-[#F23645]/20 bg-[#F23645]/[0.04] text-[#F23645]';
  if (severity === 'review') return 'border-[#EF9A09]/20 bg-[#EF9A09]/[0.04] text-[#EF9A09]';
  return 'border-[#22AB94]/20 bg-[#22AB94]/[0.04] text-[#22AB94]';
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
    <AppScreen>
      <MobilePageHeader
        eyebrow="My investments"
        title="What you own right now"
        body={`Practice research holdings only. Real brokerage money is never connected.${isLocalOnly ? ' Saved locally.' : ''}`}
        action={<div className="flex flex-wrap justify-end gap-2"><Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="mr-1 h-3 w-3" /> Add</Button><Button variant="secondary" onClick={() => setIsImportOpen(true)}><Upload className="mr-1 h-3 w-3" /> Import</Button></div>}
      />

      <section aria-label="Portfolio operating summary" className="space-y-4 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "#0f1419" }}>Portfolio operating summary</h2>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed" style={{ color: "#536471" }}>
              Concentration uses recorded cost basis. Live values appear only when every holding has a source-backed quote.
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${statusClass(review.availability)}`}>{review.availability}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Recorded cost basis", value: review.totalCostBasis > 0 ? uiFormatINR(review.totalCostBasis) : 'Data unavailable' },
            { label: "Live portfolio value", value: review.livePortfolioValue === null ? 'Data unavailable' : uiFormatINR(review.livePortfolioValue) },
            { label: "Quote coverage", value: `${review.quoteCoverage.coveredPositions}/${review.quoteCoverage.totalPositions}`, detail: `${review.quoteCoverage.coveragePct.toFixed(0)}% of holdings` },
            { label: "Largest position", value: largest ? largest.symbol : 'Data unavailable', detail: largest ? `${largest.weightPct.toFixed(2)}% of cost basis` : undefined },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>{item.label}</div>
              <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "#0f1419" }}>{item.value}</div>
              {item.detail && <div className="mt-1 text-[10px]" style={{ color: "#536471" }}>{item.detail}</div>}
            </div>
          ))}
        </div>

        {review.quoteCoverage.missingSymbols.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-3 text-[11px]" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Missing live quotes: {review.quoteCoverage.missingSymbols.join(', ')}. Market value and portfolio return are intentionally withheld.
          </div>
        )}
      </section>

      {review.reviewQueue.length > 0 && (
        <section aria-label="Portfolio review queue" className="space-y-3">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" style={{ color: "#b8860b" }} /><h2 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "#0f1419" }}>Review queue</h2></div>
          <div className="grid gap-3 md:grid-cols-2">
            {review.reviewQueue.map((item) => (
              <button key={item.id} type="button" onClick={() => item.symbol && handleOpenStock(item.symbol)} className={`rounded-lg border p-3 text-left transition-colors hover:bg-white ${reviewSeverityClass(item.severity)}`}>
                <div className="text-[11px] font-semibold">{item.title}</div>
                <div className="mt-1 text-[10px] leading-relaxed opacity-75">{item.detail}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {review.concentration.sectorExposure.length > 0 && (
        <section aria-label="Cost basis sector exposure" className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "#0f1419" }}>Sector exposure - recorded cost basis</h2>
          <div className="mt-3 space-y-2">
            {review.concentration.sectorExposure.map((item) => (
              <div key={item.sector} className="flex items-center gap-3 text-[11px]">
                <span className="w-40 truncate" style={{ color: "#536471" }}>{item.sector}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "#f0f1f5" }}>
                  <div className="h-full rounded-full" style={{ background: "#1a6e4a", width: `${Math.min(100, item.weightPct)}%` }} />
                </div>
                <span className="w-16 text-right font-mono tabular-nums" style={{ color: "#0f1419" }}>{item.weightPct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {review.holdings.length === 0 ? (
        <ResearchEmptyState title="No open positions" body="Use Search or the manual entry form to record a research position and start tracking source availability." />
      ) : (
        <section aria-label="Portfolio holdings">
          <div className="hidden sm:block overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
            <div className="grid grid-cols-[1fr_100px_70px_100px_100px_80px_64px] gap-2 p-3 text-[9px] font-bold uppercase tracking-wider" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
              <span className="pl-3">Ticker</span><span>Sector</span><span>Shares</span><span>Cost basis</span><span>Live value</span><span>Return</span><span className="text-right pr-3"></span>
            </div>
            {review.holdings.map((holding) => (
              <div key={holding.symbol} className="grid grid-cols-[1fr_100px_70px_100px_100px_80px_64px] items-center gap-2 p-3 last:border-0 hover:bg-white/30 transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
                <button type="button" onClick={() => handleOpenStock(holding.symbol)} className="cursor-pointer border-none bg-transparent pl-3 text-left font-mono font-bold hover:underline" style={{ color: "#0f1419" }}>{holding.symbol}</button>
                <span className="truncate text-[11px]" style={{ color: "#536471" }}>{holding.sector}</span>
                <span className="font-mono text-xs tabular-nums" style={{ color: "#0f1419" }}>{holding.shares}</span>
                <span className="font-mono text-xs tabular-nums" style={{ color: "#0f1419" }}>{uiFormatINR(holding.costBasis)}</span>
                <span className="font-mono text-xs tabular-nums" style={{ color: "#0f1419" }}>{holding.liveValue === null ? <span style={{ color: "#8b98a5" }}>Unavailable</span> : uiFormatINR(holding.liveValue)}</span>
                <span className={`font-mono text-xs tabular-nums ${holding.gainLossPct === null ? 'text-ink-muted' : holding.gainLossPct >= 0 ? 'text-accent-success' : 'text-rose-700'}`}>
                  {holding.gainLossPct === null ? 'Unavailable' : `${holding.gainLossPct >= 0 ? '+' : ''}${holding.gainLossPct.toFixed(2)}%`}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" aria-label={`Edit ${holding.symbol}`} onClick={() => { setEditingHolding(holding); setShares(String(holding.shares)); setPrice(String(holding.avgBuyPrice)); setFormError(''); }} className="cursor-pointer border-none bg-transparent p-1.5 hover:opacity-80" style={{ color: "#8b98a5" }}><Edit2 className="h-3 w-3" /></button>
                  <button type="button" aria-label={`Delete ${holding.symbol}`} onClick={() => setDeleteConfirmSymbol(holding.symbol)} className="cursor-pointer border-none bg-transparent p-1.5 hover:text-rose-700" style={{ color: "#8b98a5" }}><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="sm:hidden space-y-3">
            {review.holdings.map((holding) => (
              <div key={holding.symbol} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => handleOpenStock(holding.symbol)} className="cursor-pointer border-none bg-transparent font-mono font-bold text-sm hover:underline" style={{ color: "#0f1419" }}>{holding.symbol}</button>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Edit ${holding.symbol}`} onClick={() => { setEditingHolding(holding); setShares(String(holding.shares)); setPrice(String(holding.avgBuyPrice)); setFormError(''); }} className="cursor-pointer border-none bg-transparent p-1 hover:opacity-80" style={{ color: "#8b98a5" }}><Edit2 className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={`Delete ${holding.symbol}`} onClick={() => setDeleteConfirmSymbol(holding.symbol)} className="cursor-pointer border-none bg-transparent p-1 hover:text-rose-700" style={{ color: "#8b98a5" }}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div><span style={{ color: "#536471" }}>Sector</span><p className="font-medium truncate" style={{ color: "#0f1419" }}>{holding.sector}</p></div>
                  <div><span style={{ color: "#536471" }}>Shares</span><p className="font-mono font-medium tabular-nums" style={{ color: "#0f1419" }}>{holding.shares}</p></div>
                  <div><span style={{ color: "#536471" }}>Cost basis</span><p className="font-mono font-medium tabular-nums" style={{ color: "#0f1419" }}>{uiFormatINR(holding.costBasis)}</p></div>
                  <div><span style={{ color: "#536471" }}>Live value</span><p className="font-mono font-medium tabular-nums" style={{ color: "#0f1419" }}>{holding.liveValue === null ? <span style={{ color: "#8b98a5" }}>Unavailable</span> : uiFormatINR(holding.liveValue)}</p></div>
                  <div className="col-span-2">
                    <span style={{ color: "#536471" }}>Return</span>
                    <p className={`font-mono font-medium tabular-nums ${holding.gainLossPct === null ? 'text-ink-muted' : holding.gainLossPct >= 0 ? 'text-accent-success' : 'text-rose-700'}`}>
                      {holding.gainLossPct === null ? 'Unavailable' : `${holding.gainLossPct >= 0 ? '+' : ''}${holding.gainLossPct.toFixed(2)}%`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <SourceAuditCard title="Source audit" rows={[
        { label: "Holdings", value: "User entered", tone: "muted" },
        { label: "Live quotes", value: review.availability === "unavailable" ? "Unavailable" : review.availability, tone: review.availability === "real" ? "ok" : "warn" },
        { label: "Advice state", value: "Research only", tone: "ok" },
      ]} />

      <SpatialSheet open={isAddOpen} onClose={() => { setIsAddOpen(false); resetHoldingForm(); }} title="Add holding" subtitle="Record a manual holding for research tracking.">
        <form onSubmit={handleAddHolding} className="space-y-3">
          <input aria-label="Ticker" type="text" required placeholder="Ticker" value={symbol} onChange={(event) => setSymbol(event.target.value)} className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Shares" type="number" min="0.000001" step="any" required placeholder="Shares" value={shares} onChange={(event) => setShares(event.target.value)} className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" />
            <input aria-label="Average buy price" type="number" min="0.000001" step="any" required placeholder="Avg Buy Price" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" />
          </div>
          <input aria-label="Sector optional" type="text" placeholder="Sector (optional)" value={sector} onChange={(event) => setSector(event.target.value)} className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" />
          {formError && <div className="rounded-lg border border-[#F23645]/10 bg-[#F23645]/[0.03] p-2.5 text-[10px] text-[#F23645]">{formError}</div>}
          <button type="submit" className="w-full rounded-xl px-4 py-2.5 text-xs font-medium text-white transition hover:opacity-90" style={{ background: "#2962FF" }}>Save holding</button>
        </form>
      </SpatialSheet>

      <SpatialSheet open={editingHolding !== null} onClose={() => { setEditingHolding(null); setFormError(''); }} title={`Edit ${editingHolding?.symbol || ''}`} subtitle="Update shares or average buy price.">
        <form onSubmit={handleEditHolding} className="space-y-3">
          <input aria-label="Edit shares" type="number" min="0.000001" step="any" required value={shares} onChange={(event) => setShares(event.target.value)} className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" placeholder="Shares" />
          <input aria-label="Edit average buy price" type="number" min="0.000001" step="any" required value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" placeholder="Avg Buy Price" />
          {formError && <div className="rounded-lg border border-[#F23645]/10 bg-[#F23645]/[0.03] p-2.5 text-[10px] text-[#F23645]">{formError}</div>}
          <button type="submit" className="w-full rounded-xl px-4 py-2.5 text-xs font-medium text-white transition hover:opacity-90" style={{ background: "#2962FF" }}>Save</button>
        </form>
      </SpatialSheet>

      <SpatialSheet open={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import CSV" subtitle="TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]">
        <form onSubmit={handleCSVImport} className="space-y-3">
          <textarea aria-label="Portfolio CSV" required rows={6} placeholder="TCS,10,3600,IT" value={csvText} onChange={(event) => setCsvText(event.target.value)} className="w-full resize-none rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" />
          <p className="text-[10px] leading-relaxed text-[#8B949E]">Format: TICKER,SHARES,AVG_BUY_PRICE[,SECTOR]. Missing sectors remain explicitly unavailable.</p>
          {importError && <div className="rounded-lg border border-[#F23645]/10 bg-[#F23645]/[0.03] p-2.5 text-[10px] text-[#F23645]">{importError}</div>}
          <button type="submit" className="w-full rounded-xl px-4 py-2.5 text-xs font-medium text-white transition hover:opacity-90" style={{ background: "#2962FF" }}>Parse and import</button>
        </form>
      </SpatialSheet>

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
    </AppScreen>
  );
};

export default PortfolioPage;
