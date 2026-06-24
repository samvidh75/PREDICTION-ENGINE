import React from "react";

interface ShareholdingData {
  promoter: number | null;
  fii: number | null;
  dii: number | null;
  public_: number | null;
  others: number | null;
  period: string;
}

interface ShareholdingDoughnutProps {
  data: ShareholdingData | null;
  loading?: boolean;
}

const COLORS = ["#2962FF", "#16A34A", "#92400E", "#64748B", "#6B7280"];
const LABELS = ["Promoters", "FII", "DII", "Public", "Others"];
const KEYS: (keyof ShareholdingData)[] = ["promoter", "fii", "dii", "public_", "others"];

export const ShareholdingDoughnut: React.FC<ShareholdingDoughnutProps> = ({ data, loading }) => {
  if (loading) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse"><div className="h-32 bg-[var(--color-surface-elevated)] rounded" /></div>;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-xs text-[var(--color-text-muted)]">Shareholding data is not yet available.</span>
      </div>
    );
  }

  const segments = KEYS.map((key, i) => ({
    label: LABELS[i],
    value: typeof data[key] === "number" ? (data[key] as number) : null,
    color: COLORS[i],
  }));

  const total = segments.reduce((s, seg) => s + (seg.value ?? 0), 0);
  const halfCircumference = 94.2;
  let cumulative = 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Shareholding Pattern</span>
        {data.period && <span className="text-[10px] text-[var(--color-text-muted)]">{data.period}</span>}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <svg width="120" height="120" viewBox="0 0 40 40" className="-rotate-90 shrink-0">
          {segments.map((seg, i) => {
            if (seg.value === null || seg.value === 0) return null;
            const pct = seg.value / (total || 1);
            const offset = cumulative * halfCircumference;
            cumulative += pct;
            if (pct >= 1) {
              return <circle key={seg.label} cx="20" cy="20" r="15" fill="none" stroke={seg.color} strokeWidth="4" />;
            }
            return <circle key={seg.label} cx="20" cy="20" r="15" fill="none" stroke={seg.color} strokeWidth="4" strokeDasharray={`${pct * halfCircumference} ${(1 - pct) * halfCircumference}`} strokeDashoffset={-offset} />;
          })}
        </svg>

        <div className="space-y-1.5">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[var(--color-text-secondary)]">{seg.label}</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{seg.value !== null ? `${seg.value.toFixed(1)}%` : "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareholdingDoughnut;
