/**
 * ResearchCorrectionService — Tracks and manages research quality corrections.
 *
 * When users report incorrect information, this service:
 *  1. Logs the correction request
 *  2. Categorizes the issue type
 *  3. Tracks resolution status
 *  4. Provides analytics on correction trends
 */

export type CorrectionStatus = 'reported' | 'in_review' | 'confirmed' | 'fixed' | 'dismissed';

export interface CorrectionRecord {
  id: string;
  symbol?: string;
  component: string; // thesis, bullCase, bearCase, risks, financials, etc.
  issueType: string; // INACCURATE_DATA, OUTDATED_INFO, MISSING_CONTEXT, etc.
  description: string;
  reporterId: string;
  reportedAt: string;
  status: CorrectionStatus;
  resolvedAt?: string;
  resolution?: string;
  fixSummary?: string;
}

export interface CorrectionAnalytics {
  totalReported: number;
  totalFixed: number;
  totalDismissed: number;
  avgTimeToResolution: number; // hours
  byComponent: Record<string, { reported: number; fixed: number }>;
  byIssueType: Record<string, number>;
  trend: Array<{ date: string; reported: number; fixed: number }>;
}

const corrections: CorrectionRecord[] = [];

let nextId = 1;

function generateId(): string {
  return `corr-${Date.now()}-${nextId++}`;
}

export function reportCorrection(record: Omit<CorrectionRecord, 'id' | 'reportedAt' | 'status'>): CorrectionRecord {
  const newRecord: CorrectionRecord = {
    ...record,
    id: generateId(),
    reportedAt: new Date().toISOString(),
    status: 'reported',
  };
  corrections.unshift(newRecord);
  return newRecord;
}

export function updateCorrectionStatus(
  id: string,
  status: CorrectionStatus,
  resolution?: string,
  fixSummary?: string,
): CorrectionRecord | undefined {
  const record = corrections.find((c) => c.id === id);
  if (!record) return undefined;
  record.status = status;
  if (status === 'fixed' || status === 'dismissed') {
    record.resolvedAt = new Date().toISOString();
    record.resolution = resolution;
    if (fixSummary) record.fixSummary = fixSummary;
  }
  return record;
}

export function getCorrection(id: string): CorrectionRecord | undefined {
  return corrections.find((c) => c.id === id);
}

export function getAllCorrections(status?: CorrectionStatus): CorrectionRecord[] {
  if (status) return corrections.filter((c) => c.status === status);
  return [...corrections];
}

export function getCorrectionsBySymbol(symbol: string): CorrectionRecord[] {
  return corrections.filter((c) => c.symbol === symbol);
}

export function getCorrectionAnalytics(): CorrectionAnalytics {
  const totalReported = corrections.length;
  const fixed = corrections.filter((c) => c.status === 'fixed');
  const dismissed = corrections.filter((c) => c.status === 'dismissed');

  const byComponent: Record<string, { reported: number; fixed: number }> = {};
  const byIssueType: Record<string, number> = {};
  const dailyBuckets = new Map<string, { reported: number; fixed: number }>();

  for (const c of corrections) {
    if (!byComponent[c.component]) byComponent[c.component] = { reported: 0, fixed: 0 };
    byComponent[c.component].reported++;
    if (c.status === 'fixed') byComponent[c.component].fixed++;

    byIssueType[c.issueType] = (byIssueType[c.issueType] ?? 0) + 1;

    const date = c.reportedAt.slice(0, 10);
    if (!dailyBuckets.has(date)) dailyBuckets.set(date, { reported: 0, fixed: 0 });
    dailyBuckets.get(date)!.reported++;
    if (c.status === 'fixed') dailyBuckets.get(date)!.fixed++;
  }

  // Average time to resolution (hours)
  const resolvedCorrections = corrections.filter((c) => c.resolvedAt && c.status === 'fixed');
  const totalHours = resolvedCorrections.reduce((sum, c) => {
    const reported = new Date(c.reportedAt).getTime();
    const resolved = new Date(c.resolvedAt!).getTime();
    return sum + (resolved - reported) / (1000 * 60 * 60);
  }, 0);
  const avgTimeToResolution = resolvedCorrections.length > 0
    ? Math.round(totalHours / resolvedCorrections.length)
    : 0;

  const trend = Array.from(dailyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, data]) => ({ date, reported: data.reported, fixed: data.fixed }));

  return {
    totalReported,
    totalFixed: fixed.length,
    totalDismissed: dismissed.length,
    avgTimeToResolution,
    byComponent,
    byIssueType,
    trend,
  };
}

export function clearCorrections(): void {
  corrections.length = 0;
}
