import React from "react";

export default function CompanyMethodologyAndRegistry(): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-6">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
          Methodology
        </span>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          Research process
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Scores are calculated from available financial data through a structured process. Each step is explained below.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-900">1. Raw data</span>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Price movements, trading volumes, and fundamental ratios are collected from public sources when available.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-900">2. Factor scoring</span>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Each company receives factor scores (0–100) relative to peers. Higher scores indicate stronger standing in that dimension.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-900">3. Driver analysis</span>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Positive and negative drivers are identified from the scored factors, showing what supports or detracts from the overall assessment.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-900">4. Summary</span>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Results are presented as readable summaries with clear indicators for each dimension.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
