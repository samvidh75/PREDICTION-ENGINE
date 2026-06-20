export interface SignalLabelInfo {
  label: string;
  color: string;
  toneClass?: string;
}

export function signalLabelFromScore(score: number | null): SignalLabelInfo | null {
  if (score === null || score === undefined) return null;
  if (score >= 75) return { label: 'Very Healthy', color: '#16A34A', toneClass: 'constructive' };
  if (score >= 55) return { label: 'Healthy', color: '#2962FF', toneClass: 'affirmative' };
  if (score >= 40) return { label: 'Needs review', color: '#F59E0B', toneClass: 'warning' };
  return { label: 'Risk rising', color: '#EF4444', toneClass: 'danger' };
}
