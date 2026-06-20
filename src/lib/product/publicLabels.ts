/**
 * Public Labels — canonical shared utility for all public-facing health,
 * research stance, and conviction labels.
 *
 * Every frontend component MUST use these functions.
 * No route-local switch statements or label constants.
 */

// ── Healthometer labels (company condition) ──
export type HealthometerLabel =
  | 'Very healthy'
  | 'Healthy'
  | 'Stable'
  | 'Needs review'
  | 'Risk rising'
  | 'Fragile'
  | 'Not enough information';

// ── Research / conviction labels (research context) ──
export type ResearchStanceLabel =
  | 'High conviction'
  | 'Watch'
  | 'Needs review'
  | 'Risk rising'
  | 'Thesis improving'
  | 'Avoid for now'
  | 'Partial research context'
  | 'Not enough information';

export interface LabelTone {
  label: string;
  color: string;
  bg: string;
  border: string;
}

// ── Deprecated label mapping ──
const DEPRECATED_TO_HEALTHOMETER: Record<string, HealthometerLabel> = {
  'Unhealthy': 'Needs review',
  'Very Unhealthy': 'Fragile',
  'Weakening': 'Needs review',
  'Excellent': 'Very healthy',
  'HEALTHY': 'Healthy',
  'STABLE': 'Stable',
  'WEAKENING': 'Needs review',
  'AT_RISK': 'Risk rising',
  'INSUFFICIENT_DATA': 'Not enough information',
};

const DEPRECATED_TO_RESEARCH: Record<string, ResearchStanceLabel> = {
  'Unhealthy': 'Risk rising',
  'Very Unhealthy': 'Avoid for now',
  'Weakening': 'Needs review',
  'Fair': 'Needs review',
  'Good': 'Watch',
};

// ── Normalize a label to Healthometer canonical label ──
export function normalizeHealthometerLabel(raw: string | null | undefined): HealthometerLabel {
  if (!raw) return 'Not enough information';
  const trimmed = raw.trim();
  const allowed: HealthometerLabel[] = ['Very healthy', 'Healthy', 'Stable', 'Needs review', 'Risk rising', 'Fragile', 'Not enough information'];
  if (allowed.includes(trimmed as HealthometerLabel)) return trimmed as HealthometerLabel;
  return DEPRECATED_TO_HEALTHOMETER[trimmed] ?? 'Not enough information';
}

export function healthometerLabelFromScore(score: number | null | undefined): HealthometerLabel {
  if (score === null || score === undefined || !Number.isFinite(score)) return 'Not enough information';
  if (score >= 80) return 'Very healthy';
  if (score >= 65) return 'Healthy';
  if (score >= 45) return 'Stable';
  if (score >= 30) return 'Needs review';
  return 'Fragile';
}

// ── Normalize a label to Research stance canonical label ──
export function normalizeResearchStance(raw: string | null | undefined): ResearchStanceLabel {
  if (!raw) return 'Not enough information';
  const trimmed = raw.trim();
  const allowed: ResearchStanceLabel[] = ['High conviction', 'Watch', 'Needs review', 'Risk rising', 'Thesis improving', 'Avoid for now', 'Partial research context', 'Not enough information'];
  if (allowed.includes(trimmed as ResearchStanceLabel)) return trimmed as ResearchStanceLabel;
  return DEPRECATED_TO_RESEARCH[trimmed] ?? 'Not enough information';
}

// ── Tone mapping for Healthometer labels ──
export function getHealthometerTone(label: HealthometerLabel | string | null | undefined): LabelTone {
  const h = normalizeHealthometerLabel(label);
  switch (h) {
    case 'Very healthy': return { label: h, color: '#16A34A', bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.3)' };
    case 'Healthy': return { label: h, color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' };
    case 'Stable': return { label: h, color: '#2962FF', bg: 'rgba(41,98,255,0.12)', border: 'rgba(41,98,255,0.25)' };
    case 'Needs review': return { label: h, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
    case 'Risk rising': return { label: h, color: '#FB923C', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)' };
    case 'Fragile': return { label: h, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' };
    default: return { label: 'Not enough information', color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' };
  }
}

// ── Tone mapping for Research stance labels ──
export function getResearchStanceTone(stance: ResearchStanceLabel | string | null | undefined): LabelTone {
  const s = normalizeResearchStance(stance);
  switch (s) {
    case 'High conviction': return { label: s, color: '#16A34A', bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.3)' };
    case 'Watch': return { label: s, color: '#2962FF', bg: 'rgba(41,98,255,0.12)', border: 'rgba(41,98,255,0.25)' };
    case 'Thesis improving': return { label: s, color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' };
    case 'Needs review': return { label: s, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
    case 'Risk rising': return { label: s, color: '#FB923C', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)' };
    case 'Avoid for now': return { label: s, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' };
    default: return { label: 'Not enough information', color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' };
  }
}

// ── Display copy for Healthometer ──
export function getHealthometerDisplayCopy(label: HealthometerLabel | string | null | undefined): string {
  const h = normalizeHealthometerLabel(label);
  switch (h) {
    case 'Very healthy': return 'Strong business quality and financial position.';
    case 'Healthy': return 'Good fundamentals with manageable risk factors.';
    case 'Stable': return 'Balanced risk-reward profile. Monitor for changes.';
    case 'Needs review': return 'Some metrics warrant closer examination before proceeding.';
    case 'Risk rising': return 'Deteriorating indicators detected. Exercise caution.';
    case 'Fragile': return 'Multiple stress signals. High-risk profile.';
    default: return 'Not enough information to assess company health.';
  }
}

// ── Display copy for Research stance ──
export function getResearchStanceDisplayCopy(stance: ResearchStanceLabel | string | null | undefined): string {
  const s = normalizeResearchStance(stance);
  switch (s) {
    case 'High conviction': return 'Strong alignment across research dimensions.';
    case 'Watch': return 'Reasonable research context. Track for changes.';
    case 'Needs review': return 'Mixed signals detected. Review before proceeding.';
    case 'Risk rising': return 'Warning indicators are increasing.';
    case 'Thesis improving': return 'Recent changes strengthen the research case.';
    case 'Avoid for now': return 'Multiple concerns suggest caution.';
    default: return 'Partial research context is based on available data.';
  }
}

// ── Safety assertions ──
const FORBIDDEN_LABELS = ['Unhealthy', 'Very Unhealthy', 'Excellent', 'HEALTHY', 'STABLE', 'WEAKENING', 'AT_RISK', 'INSUFFICIENT_DATA', 'Fair', 'Good'];

export function isPublicSafeLabel(label: string | null | undefined): boolean {
  if (!label) return true;
  return !FORBIDDEN_LABELS.includes(label.trim());
}

export function assertNoDeprecatedPublicLabel(label: string | null | undefined): void {
  if (!isPublicSafeLabel(label)) {
    throw new Error(`Deprecated public label detected: "${label}". Use normalizeHealthometerLabel() or normalizeResearchStance().`);
  }
}

// ── Map score to research stance (replaces old mapScoreToStance) ──
export function mapScoreToResearchStance(
  score: number | null,
  activeDimensions: number,
  totalDimensions: number,
): ResearchStanceLabel {
  if (score === null || activeDimensions < 2) return 'Not enough information';
  const ratio = activeDimensions / Math.max(totalDimensions, 1);
  if (score >= 70 && ratio >= 0.6) return 'High conviction';
  if (score >= 50 && ratio >= 0.4) return 'Watch';
  if (ratio >= 0.3) return 'Needs review';
  return 'Partial research context';
}
