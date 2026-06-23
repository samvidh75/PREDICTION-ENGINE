import React, { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { ProductPanel } from "../product/ProductUI";
import { canViewHealthometerDetail, getCurrentPlan, UPGRADE_URL } from "../../lib/product/planAccess";
import HealthometerDetailSheet from "./HealthometerDetailSheet";
import HealthometerUpgradeSheet from "./HealthometerUpgradeSheet";

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

export default function HealthometerPanel({ label, score, dimensions, loading }: HealthometerPanelProps): JSX.Element {
  const [detailOpen, setDetailOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading) {
    return (
      <ProductPanel className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-20 rounded bg-slate-200" />
          <div className="h-2 rounded-full bg-slate-100" />
        </div>
      </ProductPanel>
    );
  }

  if (!score && dimensions.length === 0) {
    return (
      <ProductPanel className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Healthometer</div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Not enough information for full Healthometer yet.</p>
      </ProductPanel>
    );
  }

  const validDims = dimensions.filter((d) => d.score !== null && !Number.isNaN(d.score));
  const safeScore = (score !== null && !Number.isNaN(score)) ? score : null;
  const displayScore = safeScore ?? (validDims.length > 0 ? Math.round(validDims.reduce((s, d) => s + (d.score ?? 0), 0) / validDims.length) : null);

  const topDrivers = validDims.filter((d) => (d.score ?? 0) >= 60).slice(0, 3);
  const topRisks = validDims.filter((d) => (d.score ?? 0) < 45).slice(0, 3);
  const hasDetail = canViewHealthometerDetail(getCurrentPlan());

  return (
    <>
      <ProductPanel className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Healthometer {!hasDetail && <Lock className="ml-1 inline h-3 w-3" />}
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{label ?? "In review"}</div>
            {topDrivers.length > 0 && (
              <div className="mt-2 text-xs leading-5 text-emerald-600">
                <span className="font-medium">Strengths: </span>
                {topDrivers.map((d) => d.label).join(", ")}
              </div>
            )}
            {topRisks.length > 0 && (
              <div className="text-xs leading-5 text-amber-600">
                <span className="font-medium">Watch: </span>
                {topRisks.map((d) => d.label).join(", ")}
              </div>
            )}
          </div>
          {displayScore !== null && (
            <div className="shrink-0 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
              {displayScore}
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => hasDetail ? setDetailOpen(true) : setUpgradeOpen(true)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-blue-200 hover:text-[var(--color-text-primary)]"
          >
            {hasDetail ? "See detailed breakdown" : "Unlock detailed breakdown"}
          </button>
        </div>
      </ProductPanel>

      <HealthometerDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        label={label}
        score={displayScore}
        dimensions={dimensions}
      />
      <HealthometerUpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        score={displayScore}
        label={label}
      />
    </>
  );
}
