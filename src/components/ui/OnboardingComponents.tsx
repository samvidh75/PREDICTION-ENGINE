import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, AlertCircle, Play, FileText, Bookmark, Search, BarChart3, ShieldCheck, Briefcase } from "lucide-react";
import { Button } from "./Button";
import Card from "./Card";

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
    <Card className="p-5 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/10">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Onboarding Checklist
            </h3>
            <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
              {completedCount}/{steps.length} Steps
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3.5 mt-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                step.isCompleted
                  ? "bg-slate-50/50 border-slate-100"
                  : "bg-white border-slate-200 shadow-sm"
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
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
                {!step.isCompleted && step.onAction && step.actionLabel && (
                  <button
                    type="button"
                    onClick={step.onAction}
                    className="mt-2 text-[10px] font-semibold text-emerald-800 hover:text-emerald-700 inline-flex items-center gap-1 hover:underline"
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

export const DataReadinessPanel: React.FC = () => {
  return (
    <Card className="p-5 border-blue-100 bg-blue-50/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-blue-900">Data Status: Ingestion Sync Pending</h3>
          <p className="text-[11px] text-blue-800 leading-relaxed max-w-2xl">
            Live prices and structural metadata are active during market hours. Financial factor scoring models will populate verified rankings after the nightly pipeline run completes. No fabricated rankings or filler mock stock data will be shown.
          </p>
        </div>
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
