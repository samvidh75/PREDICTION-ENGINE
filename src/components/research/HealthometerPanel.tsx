import React from "react";
import { ProductPanel } from "../product/ProductUI";

export interface HealthometerDimension {
  id: string;
  label: string;
  score: number | null;
}

export interface HealthometerPanelProps {
  label: string | null;
  score: number | null;
  dimensions: HealthometerDimension[];
  loading?: boolean;
}

const DIM_COLORS: Record<string, string> = {
  quality: "#3B82F6",
  financial_strength: "#22C55E",
  valuation: "#A78BFA",
  growth: "#14B8A6",
  stability: "#64748B",
  risk: "#F59E0B",
  momentum: "#38BDF8",
};

function dimColor(id: string): string {
  return DIM_COLORS[id] || "#2962FF";
}

export default function HealthometerPanel({ label, score, dimensions, loading }: HealthometerPanelProps): JSX.Element {
  if (loading) {
    return (
      <ProductPanel className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-20 rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 rounded bg-slate-200" />
                <div className="h-2 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </ProductPanel>
    );
  }

  if (!score && dimensions.length === 0) {
    return (
      <ProductPanel className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Healthometer</div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Not enough information for full Healthometer yet.</p>
      </ProductPanel>
    );
  }

  const validDims = dimensions.filter((d) => d.score !== null && !Number.isNaN(d.score));
  const safeScore = (score !== null && !Number.isNaN(score)) ? score : null;
  const displayScore = safeScore ?? (validDims.length > 0 ? Math.round(validDims.reduce((s, d) => s + (d.score ?? 0), 0) / validDims.length) : null);

  return (
    <ProductPanel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Healthometer</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{label ?? "In review"}</div>
        </div>
        {displayScore !== null && (
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
            {displayScore}
          </div>
        )}
      </div>
      {validDims.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {dimensions.map((dimension) => (
            <div key={dimension.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">{dimension.label}</span>
                <span className="font-mono tabular-nums text-[var(--color-text-primary)]">
                  {dimension.score ?? "—"}
                </span>
              </div>
              {dimension.score !== null ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-[#161B22]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100, dimension.score))}%`,
                      backgroundColor: dimColor(dimension.id),
                    }}
                  />
                </div>
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-[#161B22] opacity-30" />
              )}
            </div>
          ))}
        </div>
      )}
    </ProductPanel>
  );
}
