/**
 * Earnings Snapshot Mapper
 *
 * Maps raw earnings/result data to canonical IntelligenceInput.earnings.
 */

export interface EarningsSnapshotRaw {
  eps_ttm?: number | string | null;
  eps_growth_qoq?: number | string | null;
  revenue_growth_qoq?: number | string | null;
  surprise_percent?: number | string | null;
  beat_miss?: string | null;
  pe_ttm?: number | string | null;
  forward_pe?: number | string | null;
  peg_ratio?: number | string | null;
  estimates_available?: boolean | number | null;
  next_earnings_date?: string | null;
  recent_earnings_date?: string | null;
  fiscal_quarter?: string | null;
  fiscal_year?: number | null;
  asOf?: string;
}

export interface EarningsSnapshotMapped {
  epsTtm: number | null;
  epsGrowthQoq: number | null;
  revenueGrowthQoq: number | null;
  surprisePercent: number | null;
  beatMiss: 'beat' | 'miss' | 'in-line' | null;
  peTtm: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  estimatesAvailable: boolean;
  nextEarningsDate: string | null;
  recentEarningsDate: string | null;
  fiscalQuarter: string | null;
  fiscalYear: number | null;
  asOf: string | null;
}

export function mapEarningsSnapshot(raw: EarningsSnapshotRaw): EarningsSnapshotMapped {
  const beatMiss = normalizeBeatMiss(raw.beat_miss);

  return {
    epsTtm: toNumber(raw.eps_ttm),
    epsGrowthQoq: toNumber(raw.eps_growth_qoq),
    revenueGrowthQoq: toNumber(raw.revenue_growth_qoq),
    surprisePercent: toNumber(raw.surprise_percent),
    beatMiss,
    peTtm: toNumber(raw.pe_ttm),
    forwardPe: toNumber(raw.forward_pe),
    pegRatio: toNumber(raw.peg_ratio),
    estimatesAvailable: raw.estimates_available === true || raw.estimates_available === 1 || raw.estimates_available === 'true',
    nextEarningsDate: raw.next_earnings_date ?? null,
    recentEarningsDate: raw.recent_earnings_date ?? null,
    fiscalQuarter: raw.fiscal_quarter ?? null,
    fiscalYear: toNumber(raw.fiscal_year),
    asOf: raw.asOf ?? null,
  };
}

function normalizeBeatMiss(v: string | null | undefined): 'beat' | 'miss' | 'in-line' | null {
  if (!v) return null;
  const lower = v.toLowerCase().trim();
  if (lower === 'beat' || lower === 'positive') return 'beat';
  if (lower === 'miss' || lower === 'negative') return 'miss';
  if (lower === 'in-line' || lower === 'meet' || lower === 'inline') return 'in-line';
  return null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}
