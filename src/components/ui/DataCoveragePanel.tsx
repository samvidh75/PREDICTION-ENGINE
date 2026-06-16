import React, { useEffect, useState } from "react";
import Card from "./Card";
import { SectionHeader, ProviderStatusPill } from "./PageHeader";
import { Server, Database, Key } from "lucide-react";

interface CoverageStats {
  count: number;
  rowCount?: number;
  symbolCount?: number;
  latestUpdatedAt?: string | null;
  latestPriceDate?: string | null;
  latestSnapshotDate?: string | null;
  latestPredictionDate?: string | null;
  status: string;
}

interface CoverageData {
  ok: boolean;
  generatedAt: string;
  database: {
    status: "ready" | "unavailable";
    migrationsReady: boolean;
    error?: string | null;
  };
  coverage: {
    symbols: CoverageStats;
    dailyPrices: CoverageStats;
    financialSnapshots: CoverageStats;
    featureSnapshots: CoverageStats;
    factorSnapshots: CoverageStats;
    predictionRegistry: CoverageStats;
  };
  providers: Record<string, "present" | "missing" | string>;
}

export const DataCoveragePanel: React.FC = () => {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/data-coverage")
      .then((res) => {
        if (!res.ok) throw new Error("Unavailable");
        return res.json();
      })
      .then((res) => {
        if (res.ok) {
          setData(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-5 border-slate-200/80 bg-white">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
          <div className="h-2 bg-slate-100 rounded w-1/2"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <div className="h-12 bg-slate-100 rounded"></div>
            <div className="h-12 bg-slate-100 rounded"></div>
            <div className="h-12 bg-slate-100 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-5 border-slate-200/80 bg-white">
        <div className="text-center py-4">
          <p className="text-xs text-slate-500 font-medium">Coverage metrics currently unavailable</p>
        </div>
      </Card>
    );
  }

  const { coverage, providers, database } = data;

  const metrics = [
    {
      label: "Indexed Symbols",
      value: coverage.symbols.status === "available" ? coverage.symbols.count.toLocaleString() : "—",
      detail: coverage.symbols.latestUpdatedAt ? `Updated ${coverage.symbols.latestUpdatedAt}` : "No predictions",
    },
    {
      label: "Daily Price Rows",
      value: coverage.dailyPrices.status === "available" ? (coverage.dailyPrices.rowCount ?? 0).toLocaleString() : "—",
      detail: coverage.dailyPrices.latestPriceDate ? `Latest: ${coverage.dailyPrices.latestPriceDate}` : "No prices",
    },
    {
      label: "Financial Snapshots",
      value: coverage.financialSnapshots.status === "available" ? (coverage.financialSnapshots.rowCount ?? 0).toLocaleString() : "—",
      detail: coverage.financialSnapshots.latestSnapshotDate ? `Latest: ${coverage.financialSnapshots.latestSnapshotDate}` : "No snapshot",
    },
    {
      label: "Features",
      value: coverage.featureSnapshots.status === "available" ? (coverage.featureSnapshots.rowCount ?? 0).toLocaleString() : "—",
      detail: coverage.featureSnapshots.latestSnapshotDate ? `Latest: ${coverage.featureSnapshots.latestSnapshotDate}` : "No features",
    },
    {
      label: "Factors",
      value: coverage.factorSnapshots.status === "available" ? (coverage.factorSnapshots.rowCount ?? 0).toLocaleString() : "—",
      detail: coverage.factorSnapshots.latestSnapshotDate ? `Latest: ${coverage.factorSnapshots.latestSnapshotDate}` : "No factors",
    },
    {
      label: "Predictions Registry",
      value: coverage.predictionRegistry.status === "available" ? (coverage.predictionRegistry.rowCount ?? 0).toLocaleString() : "—",
      detail: coverage.predictionRegistry.latestPredictionDate ? `Latest: ${coverage.predictionRegistry.latestPredictionDate}` : "No predictions",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Coverage stats block */}
      <Card className="md:col-span-2 p-5 border-slate-200/80 bg-white">
        <SectionHeader
          title="Production Data Coverage"
          subtitle="Real aggregate database volumes and update freshness."
          action={
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 font-mono">
              <Database className="h-3.5 w-3.5" />
              <span>DB: {database.status === "ready" ? "READY" : "OFFLINE"}</span>
            </div>
          }
        />
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map((m, idx) => (
            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {m.label}
              </span>
              <span className="block text-xl font-bold text-slate-950 tabular-nums">
                {m.value}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                {m.detail}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Provider environment statuses */}
      <Card className="p-5 border-slate-200/80 bg-white">
        <SectionHeader
          title="Data Providers"
          subtitle="Ingestion key availability."
          action={<Key className="h-3.5 w-3.5 text-slate-400" />}
        />
        <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
          {Object.entries(providers).map(([key, val]) => (
            <ProviderStatusPill key={key} name={key} status={val} />
          ))}
        </div>
      </Card>
    </div>
  );
};
