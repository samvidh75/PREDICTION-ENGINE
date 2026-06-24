import React from "react";
import { Activity, TrendingUp, BarChart3, Scale, DollarSign, Shield } from "lucide-react";
import { ProductPanel } from "../product/ProductUI";

export interface AnalysisMeter {
  key: string;
  label: string;
  value: string | number | null;
  interpretation?: string;
  status: "strong" | "neutral" | "caution" | "not_enough_information";
}

interface AnalysisMetersProps {
  meters: AnalysisMeter[];
  technicalNote?: string;
  fundamentalNote?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  strong: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  neutral: { bg: "bg-slate-50 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" },
  caution: { bg: "bg-slate-50 border-slate-200", text: "text-slate-700", dot: "bg-slate-500" },
  not_enough_information: { bg: "bg-gray-50 border-gray-100", text: "text-gray-400", dot: "bg-gray-300" },
};

const STATUS_LABELS: Record<string, string> = {
  strong: "Strong",
  neutral: "Neutral",
  caution: "Caution",
  not_enough_information: "Not enough information",
};

function formatValue(val: string | number | null): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (Number.isNaN(val) || !Number.isFinite(val)) return "—";
    return val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return val;
}

export default function AnalysisMeters({ meters, technicalNote, fundamentalNote }: AnalysisMetersProps): JSX.Element {
  if (meters.length === 0) {
    return (
      <ProductPanel className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Activity className="h-4 w-4" /> Analysis
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Analysis meters will appear here when sufficient data is available.
        </p>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
        <Activity className="h-3.5 w-3.5" /> Analysis meters
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {meters.map((meter) => {
          const style = STATUS_STYLES[meter.status] || STATUS_STYLES.not_enough_information;
          return (
            <div
              key={meter.key}
              className={`rounded-xl border p-4 ${style.bg}`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                {meter.label}
              </div>
              <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[var(--color-text-primary)]">
                {formatValue(meter.value)}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-medium ${style.text}`}>
                  {STATUS_LABELS[meter.status]}
                </span>
              </div>
              {meter.interpretation && (
                <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
                  {meter.interpretation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {(technicalNote || fundamentalNote) && (
        <div className="mt-4 grid gap-3 text-xs leading-5 text-[var(--color-text-secondary)] sm:grid-cols-2">
          {technicalNote && (
            <div className="rounded-lg border border-[var(--color-border-light)] bg-white p-3">
              <span className="font-semibold text-[var(--color-text-primary)]">Technical note: </span>
              {technicalNote}
            </div>
          )}
          {fundamentalNote && (
            <div className="rounded-lg border border-[var(--color-border-light)] bg-white p-3">
              <span className="font-semibold text-[var(--color-text-primary)]">Fundamental note: </span>
              {fundamentalNote}
            </div>
          )}
        </div>
      )}
    </ProductPanel>
  );
}
