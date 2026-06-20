import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, ScanSearch, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  MarketActionResponse,
  MarketMover,
  ScannerPreset,
  SectorMover,
} from '../../services/market/MarketActionService';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The dashboard consumes a backend envelope, not arbitrary JSON. Validate the
 * structural fields before committing state so partial outages and test stubs
 * render an honest unavailable panel instead of crashing the dashboard shell.
 */
export function isMarketActionResponse(value: unknown): value is MarketActionResponse {
  if (!isRecord(value)) return false;
  if (value.status !== 'real' && value.status !== 'partial' && value.status !== 'unavailable') return false;
  if (typeof value.message !== 'string') return false;
  if (!isRecord(value.data) || !isRecord(value.dataState)) return false;

  const data = value.data;
  const dataState = value.dataState;
  if (!Array.isArray(data.gainers) || !Array.isArray(data.losers)) return false;
  if (!Array.isArray(data.volumeLeaders) || !Array.isArray(data.sectorMovers)) return false;
  if (!Array.isArray(data.scannerPresets)) return false;
  if (!Array.isArray(dataState.sourceTables) || !Array.isArray(dataState.missingInputs)) return false;
  if (typeof dataState.rowsAnalyzed !== 'number' || typeof dataState.rowsWithComparisons !== 'number') return false;
  return true;
}

function formatPrice(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'Awaiting data';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function percentClass(value: number | null): string {
  if (value === null) return 'text-white/35';
  if (value > 0) return 'text-emerald-300';
  if (value < 0) return 'text-rose-300';
  return 'text-white/55';
}

function stateClass(status: MarketActionResponse['status']): string {
  if (status === 'real') return 'text-emerald-300';
  if (status === 'partial') return 'text-amber-300';
  return 'text-rose-300';
}

function EmptyState({ message }: { message: string }) {
  return <p className="px-3 py-4 text-[11px] leading-relaxed text-white/35">{message}</p>;
}

function MoverList({ items, emptyMessage, onOpenCompany }: {
  items: MarketMover[];
  emptyMessage: string;
  onOpenCompany: (symbol: string) => void;
}) {
  if (items.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div>
      {items.map((item) => (
        <button
          type="button"
          key={item.symbol}
          onClick={() => onOpenCompany(item.symbol)}
          className="flex w-full items-center gap-2 border-b border-white/[0.04] px-3 py-2 text-left text-[11px] transition-colors last:border-0 hover:bg-white/[0.035]"
        >
          <span className="min-w-[64px] font-mono font-semibold text-white">{item.symbol}</span>
          <span className="flex-1 truncate text-white/35">{formatPrice(item.price)}</span>
          <span className={`font-mono font-semibold ${percentClass(item.changePercent)}`}>{formatPercent(item.changePercent)}</span>
        </button>
      ))}
    </div>
  );
}

function SectorList({ items }: { items: SectorMover[] }) {
  if (items.length === 0) return <EmptyState message="Sector movers require at least two price dates and populated sector metadata." />;

  return (
    <div>
      {items.map((item) => (
        <div key={item.sector} className="flex items-center gap-2 border-b border-white/[0.04] px-3 py-2 text-[11px] last:border-0">
          <span className="flex-1 truncate text-white/70">{item.sector}</span>
          <span className="text-[9px] text-white/30">{item.symbolsAnalyzed} symbols</span>
          <span className={`font-mono font-semibold ${percentClass(item.averageChangePercent)}`}>{formatPercent(item.averageChangePercent)}</span>
        </div>
      ))}
    </div>
  );
}

function ScannerCard({ preset, onOpenCompany }: { preset: ScannerPreset; onOpenCompany: (symbol: string) => void }) {
  return (
    <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border-light)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">{preset.label}</h3>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${preset.availability === 'real' ? 'text-emerald-300' : 'text-white/30'}`}>
            {preset.availability}
          </span>
        </div>
        <p className="mt-1 text-[9px] leading-relaxed text-white/30">{preset.description}</p>
      </div>
      {preset.items.length === 0 ? (
        <EmptyState message="No populated snapshot rows satisfy this preset." />
      ) : (
        <div>
          {preset.items.map((item) => (
            <button
              type="button"
              key={item.symbol}
              onClick={() => onOpenCompany(item.symbol)}
              className="flex w-full items-center gap-2 border-b border-white/[0.04] px-3 py-2 text-left text-[11px] transition-colors last:border-0 hover:bg-white/[0.035]"
            >
              <span className="min-w-[64px] font-mono font-semibold text-white">{item.symbol}</span>
              <span className="flex-1 truncate text-white/35">{item.sector || 'Sector unavailable'}</span>
              <span className="font-mono font-semibold text-cyan-300">{item.displayValue}</span>
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-white/[0.04] px-3 py-2 text-[9px] text-white/25">
        Source: {preset.sourceFields.join(', ')}
      </div>
    </section>
  );
}

export default function MarketActionBoard({ onOpenCompany }: { onOpenCompany: (symbol: string) => void }) {
  const [snapshot, setSnapshot] = useState<MarketActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetch('/api/market-data/market-action', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!isMarketActionResponse(body)) throw new Error('MALFORMED_MARKET_ACTION_RESPONSE');
        if (!response.ok && body.status !== 'unavailable') throw new Error('MARKET_ACTION_UNAVAILABLE');
        return body;
      })
      .then((body) => {
        setSnapshot(body);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <section aria-label="Market action board" className="space-y-4 rounded-xl border border-[var(--color-border-light)] bg-white/[0.012] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <Activity className="mt-0.5 h-4 w-4 text-cyan-300" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Market action</h2>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-white/35">
              Stored daily prices, financial snapshots and feature snapshots only. Screens are analytical filters, not recommendations.
            </p>
          </div>
        </div>
        {snapshot && (
          <div className="text-right text-[9px] text-white/30">
            <div className={`font-bold uppercase tracking-wider ${stateClass(snapshot.status)}`}>{snapshot.status}</div>
            <div className="mt-1">As of {snapshot.asOf || 'Awaiting update'}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 py-4 text-[11px] text-white/35">Loading market snapshots...</div>
      ) : error || !snapshot ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-4 text-[11px] text-rose-200/70">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Market analysis pending.
        </div>
      ) : snapshot.status === 'unavailable' ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-4 text-[11px] text-amber-100/70">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {snapshot.message}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Gainers</h3>
              </div>
              <MoverList items={snapshot.data.gainers} emptyMessage="Gainers require at least two stored price dates." onOpenCompany={onOpenCompany} />
            </section>

            <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] px-3 py-2">
                <TrendingDown className="h-3.5 w-3.5 text-rose-300" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Losers</h3>
              </div>
              <MoverList items={snapshot.data.losers} emptyMessage="Losers require at least two stored price dates." onOpenCompany={onOpenCompany} />
            </section>

            <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] px-3 py-2">
                <BarChart3 className="h-3.5 w-3.5 text-cyan-300" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Active by volume</h3>
              </div>
              <MoverList items={snapshot.data.volumeLeaders} emptyMessage="Volume leaders require populated daily price volume." onOpenCompany={onOpenCompany} />
            </section>

            <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] px-3 py-2">
                <Activity className="h-3.5 w-3.5 text-violet-300" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Sector movers</h3>
              </div>
              <SectorList items={snapshot.data.sectorMovers} />
            </section>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <ScanSearch className="h-3.5 w-3.5 text-cyan-300" />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B949E]">Certified scanner presets</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {snapshot.data.scannerPresets.map((preset) => (
                <ScannerCard key={preset.id} preset={preset} onOpenCompany={onOpenCompany} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.04] pt-3 text-[9px] text-white/25">
            <span>{snapshot.dataState.rowsAnalyzed} latest price rows</span>
            <span>{snapshot.dataState.rowsWithComparisons} comparable rows</span>
            <span>Sources: {snapshot.dataState.sourceTables.join(', ')}</span>
            {snapshot.dataState.missingInputs.length > 0 && <span>Missing: {snapshot.dataState.missingInputs.join(', ')}</span>}
          </div>
        </>
      )}
    </section>
  );
}
