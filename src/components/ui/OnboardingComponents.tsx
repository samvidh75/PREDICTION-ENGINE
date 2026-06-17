import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, AlertCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "./Button";
import Card from "./Card";

interface OpsHealthMetrics {
  predictions_today?: number;
  symbols_covered?: number;
  pipeline_freshness?: string;
  db_health?: string;
}

interface StepItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export const OnboardingChecklist: React.FC<{ steps: StepItem[] }> = ({ steps }) => {
  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-slate-200/80 bg-white p-4">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              First steps
            </h3>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-500">
              {completedCount}/{steps.length}
            </span>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-1 grid gap-2.5 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 rounded-md border p-3 transition ${
                step.isCompleted
                  ? "border-slate-100 bg-slate-50/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-50" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-semibold ${step.isCompleted ? "text-slate-500 line-through" : "text-slate-900"}`}>
                  {step.title}
                </h4>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                  {step.description}
                </p>
                {!step.isCompleted && step.onAction && step.actionLabel && (
                  <button
                    type="button"
                    onClick={step.onAction}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 hover:text-emerald-700"
                  >
                    {step.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const DATA_PANEL_DISMISSED_KEY = "onboarding_data_panel_dismissed";

export const DataReadinessPanel: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(DATA_PANEL_DISMISSED_KEY) === "true";
    }
    return false;
  });

  const [metrics, setMetrics] = useState<OpsHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok" && data.metrics) {
          setMetrics(data.metrics);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = () => {
    window.localStorage.setItem(DATA_PANEL_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const predictionsToday =
    typeof metrics?.predictions_today === "number" && metrics.predictions_today >= 0
      ? metrics.predictions_today
      : null;
  const symbolsCovered =
    typeof metrics?.symbols_covered === "number" && metrics.symbols_covered >= 0
      ? metrics.symbols_covered
      : null;
  const hasRealData = predictionsToday !== null && predictionsToday > 0;
  const hasHealthCheck = metrics?.db_health === "connected";

  return (
    <Card className="border-slate-200/80 bg-white p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${hasRealData ? "text-emerald-700" : "text-slate-500"}`} />
        <div className="flex-1 space-y-1">
          <h3 className="text-xs font-semibold text-slate-900">
            {hasRealData
              ? "Scoring data available"
              : hasHealthCheck
                ? "Data sources connected"
                : loading
                  ? "Checking data status"
                  : "Data status pending"}
          </h3>
          <p className="max-w-2xl text-[11px] leading-5 text-slate-500">
            {hasRealData
              ? `${predictionsToday.toLocaleString()} scored records today${
                  symbolsCovered !== null ? ` across ${symbolsCovered.toLocaleString()} companies` : ""
                }.`
              : "Search works where source data exists. Rankings and scores appear once data has been verified."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss data status notice"
          className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
};

interface NextActionCardProps {
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({ title, description, actionLabel, icon, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/20 w-full group"
    >
      <div className="rounded-lg bg-slate-50 p-2 group-hover:bg-slate-100 transition-colors w-fit">
        {icon}
      </div>
      <h3 className="text-xs font-semibold text-slate-900 mt-3">{title}</h3>
      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed flex-1">{description}</p>
      <span className="text-[10px] font-bold text-emerald-800 mt-4 group-hover:text-emerald-700">
        {actionLabel}
      </span>
    </button>
  );
};
