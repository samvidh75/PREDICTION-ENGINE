import React, { useEffect, useMemo, useState } from 'react';
import { runCompanyDataPipeline, type PipelineResult } from '../services/data/CompanyDataPipeline';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fPrice, fChange } from '../lib/format';
import { ScoreRing } from '../components/ui/ScoreRing';
import { ClassificationBadge } from '../components/ui/ClassificationBadge';
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, productNavigate } from '../components/product/ProductUI';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Eye, Clock, BarChart3 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThesisSnapshot {
  symbol: string;
  addedAt: string;
  scoreAtAdd: number | null;
  classificationAtAdd: string | null;
  factorScoresAtAdd: Record<string, number | null>;
  priceAtAdd: number | null;
}

interface ThesisCardData {
  snapshot: ThesisSnapshot;
  name: string | null;
  currentPrice: number | null;
  currentScore: number | null;
  currentClassification: string | null;
  currentFactors: Record<string, number | null>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ss_thesis_snapshots';

function loadSnapshots(): ThesisSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: ThesisSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

const CLASS_LEVEL: Record<string, number> = {
  EXCELLENT: 0, HEALTHY: 1, STABLE: 2, WEAKENING: 3, AT_RISK: 4, INSUFFICIENT_DATA: 5,
};

function daysSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

function statusBadge(snapshot: ThesisSnapshot, currentScore: number | null): { label: string; cls: string } {
  if (currentScore === null || snapshot.scoreAtAdd === null) {
    return { label: 'THESIS HOLDING', cls: 'border-[#16A34A]/30 text-[#16A34A] bg-[rgba(22,163,74,0.06)]' };
  }
  const delta = currentScore - snapshot.scoreAtAdd;
  if (delta > 5) return { label: 'IMPROVING', cls: 'border-[#16A34A]/30 text-[#16A34A] bg-[rgba(22,163,74,0.06)]' };
  if (delta >= -5) return { label: 'THESIS HOLDING', cls: 'border-[#16A34A]/30 text-[#16A34A] bg-[rgba(22,163,74,0.06)]' };
  if (delta > -15) return { label: 'WEAKENING', cls: 'border-[#92400E]/30 text-[#92400E] bg-[rgba(245,158,11,0.06)]' };
  return { label: 'REVIEW NEEDED', cls: 'border-[#EF4444]/30 text-[#EF4444] bg-[rgba(239,68,68,0.06)]' };
}

function classificationDroppedTwoOrMore(snapshot: ThesisSnapshot, current: string | null): boolean {
  if (!snapshot.classificationAtAdd || !current) return false;
  const from = CLASS_LEVEL[snapshot.classificationAtAdd];
  const to = CLASS_LEVEL[current];
  if (from === undefined || to === undefined) return false;
  return to - from >= 2;
}

function computeDeltaScore(snapshot: ThesisSnapshot, currentScore: number | null): string | null {
  if (snapshot.scoreAtAdd === null || currentScore === null) return null;
  const delta = currentScore - snapshot.scoreAtAdd;
  if (delta > 0) return `+${Math.round(delta)}`;
  if (delta < 0) return `${Math.round(delta)}`;
  return '0';
}

function factorDeltas(snapshot: ThesisSnapshot, current: Record<string, number | null>): Array<{ group: string; was: number | null; now: number | null; delta: number | null }> {
  const groups = new Set([...Object.keys(snapshot.factorScoresAtAdd), ...Object.keys(current)]);
  return Array.from(groups).map((group) => {
    const was = snapshot.factorScoresAtAdd[group] ?? null;
    const now = current[group] ?? null;
    const delta = was !== null && now !== null ? now - was : null;
    return { group, was, now, delta };
  });
}

function whatChangedText(snapshot: ThesisSnapshot, currentScore: number | null, currentClassification: string | null, currentFactors: Record<string, number | null>): string {
  const parts: string[] = [];

  if (snapshot.scoreAtAdd !== null && currentScore !== null) {
    const delta = currentScore - snapshot.scoreAtAdd;
    if (delta > 0) parts.push(`Score improved by ${Math.round(delta)} points`);
    else if (delta < 0) parts.push(`Score declined by ${Math.abs(Math.round(delta))} points`);
  }

  if (snapshot.classificationAtAdd && currentClassification && snapshot.classificationAtAdd !== currentClassification) {
    const fromLevel = CLASS_LEVEL[snapshot.classificationAtAdd];
    const toLevel = CLASS_LEVEL[currentClassification];
    if (fromLevel !== undefined && toLevel !== undefined) {
      if (toLevel < fromLevel) parts.push(`Classification upgraded from ${snapshot.classificationAtAdd} to ${currentClassification}`);
      else parts.push(`Classification downgraded from ${snapshot.classificationAtAdd} to ${currentClassification}`);
    }
  }

  const deltas = factorDeltas(snapshot, currentFactors).filter((d) => d.delta !== null && Math.abs(d.delta) >= 3);
  const improved = deltas.filter((d) => d.delta! > 0);
  const declined = deltas.filter((d) => d.delta! < 0);
  if (improved.length > 0) parts.push(`${improved.map((d) => d.group).join(', ')} improved`);
  if (declined.length > 0) parts.push(`${declined.map((d) => d.group).join(', ')} declined`);

  if (parts.length === 0) return 'No significant changes detected.';
  return parts.join('. ') + '.';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PortfolioPage: React.FC = () => {
  useDocumentTitle("Thesis Monitor | StockStory India");
  const [snapshots, setSnapshots] = useState<ThesisSnapshot[]>(() => loadSnapshots());
  const [pipelineResults, setPipelineResults] = useState<Record<string, PipelineResult>>({});
  const [loading, setLoading] = useState(true);

  const symbols = useMemo(() => snapshots.map((s) => s.symbol), [snapshots]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled(symbols.map((sym) => runCompanyDataPipeline(sym))).then((settled) => {
      const map: Record<string, PipelineResult> = {};
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') map[symbols[i]] = r.value;
      });
      setPipelineResults((prev) => ({ ...prev, ...map }));
      setLoading(false);
    });
  }, [symbols.join(',')]);

  const cardData: ThesisCardData[] = useMemo(() => {
    return snapshots.map((snap) => {
      const pipe = pipelineResults[snap.symbol];
      const pred = pipe?.prediction;
      const currentFactors: Record<string, number | null> = {};
      if (pred) {
        for (const fs of pred.factorScores) {
          currentFactors[fs.group] = fs.value;
        }
      }
      return {
        snapshot: snap,
        name: pipe?.companyName ?? null,
        currentPrice: pipe?.price.current ?? null,
        currentScore: pred?.rankingScore ?? null,
        currentClassification: pred?.classification ?? null,
        currentFactors,
      };
    });
  }, [snapshots, pipelineResults]);

  const handleRemove = (symbol: string) => {
    const updated = snapshots.filter((s) => s.symbol !== symbol);
    setSnapshots(updated);
    saveSnapshots(updated);
    setPipelineResults((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  return (
    <ProductShell>
      <ProductPage>
        <ProductPanel className="p-5 sm:p-6" as="section" aria-label="Thesis monitor">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Thesis monitor</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Research thesis tracker</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--color-text-secondary)]">
                Track how your research theses evolve over time. Monitor score and factor changes for stocks you're watching.
              </p>
            </div>
          </div>
        </ProductPanel>

        {snapshots.length === 0 ? (
          <ProductEmptyState
            icon={Eye}
            title="No tracked theses"
            body="You haven't tracked any stocks yet. Research a stock and click 'Track thesis' to monitor it here."
            action={
              <ProductAction variant="primary" onClick={() => productNavigate('scanner')}>
                <BarChart3 className="h-3.5 w-3.5" /> Start researching
              </ProductAction>
            }
          />
        ) : (
          <div className="space-y-3">
            {loading && snapshots.length > 0 && Object.keys(pipelineResults).length === 0 && (
              <div className="flex items-center justify-center py-8 text-xs text-[var(--color-text-secondary)]">
                <Clock className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading thesis data...
              </div>
            )}
            {cardData.map((card) => {
              const snap = card.snapshot;
              const badge = statusBadge(snap, card.currentScore);
              const isReview = classificationDroppedTwoOrMore(snap, card.currentClassification);
              const actualBadge = isReview ? { label: 'REVIEW NEEDED', cls: 'border-[#EF4444]/30 text-[#EF4444] bg-[rgba(239,68,68,0.06)]' } : badge;
              const deltaScore = computeDeltaScore(snap, card.currentScore);
              const fDeltas = factorDeltas(snap, card.currentFactors);
              const changed = whatChangedText(snap, card.currentScore, card.currentClassification, card.currentFactors);

              return (
                <ProductPanel key={snap.symbol} className="overflow-hidden p-0" as="section" aria-label={`${snap.symbol} thesis`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-[rgba(148,163,184,0.08)] p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => productNavigate('stock', snap.symbol)}
                          className="cursor-pointer border-none bg-transparent font-mono text-sm font-bold text-[var(--color-text-primary)] hover:underline"
                        >
                          {snap.symbol}
                        </button>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${actualBadge.cls}`}>
                          {actualBadge.label}
                        </span>
                      </div>
                      {card.name && (
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{card.name}</div>
                      )}
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#64748B]">
                        <Clock className="h-3 w-3" />
                        Added {daysSince(snap.addedAt)} days ago at {fPrice(snap.priceAtAdd)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(snap.symbol)}
                      className="cursor-pointer border-none bg-transparent p-1 text-[#64748B] hover:text-[#EF4444] transition-colors"
                      aria-label={`Remove ${snap.symbol}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_1.5fr]">
                    {/* Left: Score change */}
                    <div className="flex flex-col items-center gap-2 sm:items-start">
                      <ScoreRing score={card.currentScore} size="md" showGrade />
                      <div className="text-center sm:text-left">
                        {deltaScore !== null && (
                          <div className={`text-xs font-bold tabular-nums ${card.currentScore !== null && snap.scoreAtAdd !== null && card.currentScore >= snap.scoreAtAdd ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                            Delta {deltaScore}
                          </div>
                        )}
                        {snap.scoreAtAdd !== null && (
                          <div className="text-[10px] text-[#64748B]">Was {Math.round(snap.scoreAtAdd)}</div>
                        )}
                      </div>
                    </div>

                    {/* Center: Classification change */}
                    <div className="flex flex-col items-center gap-1.5 sm:items-start">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Classification</div>
                      {card.currentClassification ? (
                        <ClassificationBadge classification={card.currentClassification} size="sm" />
                      ) : (
                        <span className="text-[10px] text-[#64748B]">—</span>
                      )}
                      {snap.classificationAtAdd && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
                          Was <ClassificationBadge classification={snap.classificationAtAdd} size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Right: Factor changes */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">Factor changes</div>
                      <div className="space-y-1">
                        {fDeltas.map((fd) => (
                          <div key={fd.group} className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="capitalize text-[var(--color-text-secondary)] w-20 truncate">{fd.group}</span>
                            <span className="font-mono tabular-nums text-[var(--color-text-primary)]">
                              {fd.was !== null ? Math.round(fd.was) : '—'} → {fd.now !== null ? Math.round(fd.now) : '—'}
                            </span>
                            <span className={`flex items-center gap-0.5 font-mono tabular-nums ${
                              fd.delta === null ? 'text-[#64748B]' : fd.delta > 0 ? 'text-[#16A34A]' : fd.delta < 0 ? 'text-[#EF4444]' : 'text-[#64748B]'
                            }`}>
                              {fd.delta === null ? '—' : fd.delta > 0 ? <TrendingUp className="h-3 w-3" /> : fd.delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {fd.delta !== null && `${fd.delta > 0 ? '+' : ''}${Math.round(fd.delta)}`}
                            </span>
                          </div>
                        ))}
                        {fDeltas.length === 0 && (
                          <div className="text-[10px] text-[#64748B]">No factor data available</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* What changed */}
                  <div className="border-t border-[rgba(148,163,184,0.08)] px-4 py-3">
                    <div className="flex items-start gap-2">
                      <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" />
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{changed}</p>
                    </div>
                  </div>
                </ProductPanel>
              );
            })}
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default PortfolioPage;
