/**
 * Sector Context Mapper
 *
 * Maps raw sector data to canonical IntelligenceInput.sector.
 */

export interface SectorContextRaw {
  name: string;
  sectorStrength?: number | string | null;    // 0-100
  sectorMomentum?: string | null;              // accelerating | steady | decelerating
  sectorPe?: number | string | null;
  sectorAvgGrowth?: number | string | null;    // percentage
  sectorAvgMargin?: number | string | null;    // percentage
  asOf?: string;
}

export interface SectorContextMapped {
  name: string;
  sectorStrength: number | null;
  sectorMomentum: 'accelerating' | 'steady' | 'decelerating' | null;
  sectorPe: number | null;
  sectorAvgGrowth: number | null;
  sectorAvgMargin: number | null;
  asOf: string | null;
}

export function mapSectorContext(raw: SectorContextRaw): SectorContextMapped {
  return {
    name: raw.name || 'Unknown',
    sectorStrength: toNumber(raw.sectorStrength),
    sectorMomentum: normalizeMomentum(raw.sectorMomentum),
    sectorPe: toNumber(raw.sectorPe),
    sectorAvgGrowth: toNumber(raw.sectorAvgGrowth),
    sectorAvgMargin: toNumber(raw.sectorAvgMargin),
    asOf: raw.asOf ?? null,
  };
}

function normalizeMomentum(v: string | null | undefined): 'accelerating' | 'steady' | 'decelerating' | null {
  if (!v) return null;
  const lower = v.toLowerCase().trim();
  if (lower === 'accelerating' || lower === 'strong' || lower === 'improving') return 'accelerating';
  if (lower === 'steady' || lower === 'stable' || lower === 'neutral') return 'steady';
  if (lower === 'decelerating' || lower === 'weakening' || lower === 'declining') return 'decelerating';
  return null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}
