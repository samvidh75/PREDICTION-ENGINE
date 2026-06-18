import React from "react";
import { Database, Calendar, Activity, AlertTriangle, ChevronRight } from "lucide-react";
import { SpatialSheet } from "./SpatialSheet";

interface LineageEntry {
  sourceTable: string | null;
  sourceField?: string | null;
  provider?: string | null;
  asOf?: string | null;
  retrievedAt?: string | null;
  isFallback: boolean;
  isSynthetic: boolean;
  notes?: string | null;
}

interface SourceTraceTimelineProps {
  entries: LineageEntry[];
  modelRun?: { modelVersion: string; runDate: string; status: string } | null;
  completeness?: Record<string, number> | null;
  symbol: string;
  className?: string;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function SourcePill({ provider, isFallback }: { provider?: string | null; isFallback: boolean }) {
  if (!provider) return <span className="text-[10px] text-[#484F58]">Unknown</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
      isFallback ? "border-[#EF9A09]/10 text-[#EF9A09]" : "border-[#22AB94]/10 text-[#22AB94]"
    }`}>
      {provider}
      {isFallback && <span className="text-[#484F58]">(fallback)</span>}
    </span>
  );
}

export function SourceTraceTimeline({ entries, modelRun, completeness, symbol, className = "" }: SourceTraceTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#484F58]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[#E6EDF3]">Source trace — {symbol}</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <AlertTriangle className="mx-auto h-5 w-5 text-[#484F58]" aria-hidden="true" />
          <p className="mt-2 text-xs text-[#8B949E]">Lineage unavailable for this symbol.</p>
          <p className="mt-1 text-[10px] text-[#484F58]">Source trace pending for this input.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
        <span className="text-xs font-semibold text-[#E6EDF3]">Source trace — {symbol}</span>
        <span className="text-[10px] text-[#484F58]">({entries.length} entries)</span>
      </div>

      {modelRun && (
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
          <span className="text-[10px] text-[#8B949E]">Model run:</span>
          <span className="text-[10px] font-medium text-[#E6EDF3]">{modelRun.modelVersion}</span>
          <span className="text-[10px] text-[#484F58]">·</span>
          <span className="text-[10px] text-[#8B949E]">{formatDate(modelRun.runDate)}</span>
          <span className="text-[10px] text-[#484F58]">· {modelRun.status}</span>
        </div>
      )}

      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#E6EDF3]">{entry.sourceField || entry.sourceTable}</span>
                {entry.sourceTable && (
                  <span className="text-[10px] text-[#484F58]">{entry.sourceTable}</span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <SourcePill provider={entry.provider} isFallback={entry.isFallback} />
                {entry.asOf && (
                  <span className="text-[10px] text-[#484F58]">
                    <Calendar className="mr-0.5 inline h-3 w-3" aria-hidden="true" />
                    {formatDate(entry.asOf)}
                  </span>
                )}
              </div>
              {entry.notes && (
                <p className="mt-0.5 text-[10px] text-[#EF9A09]">{entry.notes}</p>
              )}
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#484F58]" aria-hidden="true" />
          </div>
        ))}
      </div>

      {completeness && Object.keys(completeness).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(completeness).map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#8B949E]">
              {key}: {Math.round(val)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResearchAuditDrawer({ open, onClose, symbol }: { open: boolean; onClose: () => void; symbol: string }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!open || !symbol) return;
    setLoading(true);
    fetch(`/api/research/lineage/${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((res) => { setData(res?.data || res); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [open, symbol]);

  return (
    <SpatialSheet open={open} onClose={onClose} title={`Research audit — ${symbol}`} subtitle="Data source trace, input lineage, model run, and freshness information.">
      {loading ? (
        <div className="py-8 text-center text-xs text-[#484F58]">Loading lineage data...</div>
      ) : data?.entries ? (
        <SourceTraceTimeline
          entries={data.entries}
          modelRun={data.modelRun}
          completeness={data.completeness}
          symbol={symbol}
        />
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
          <p className="text-xs text-[#8B949E]">Source audit data unavailable.</p>
          <p className="mt-1 text-[10px] text-[#484F58]">No input lineage records found for {symbol}.</p>
        </div>
      )}
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-[10px] leading-relaxed text-[#484F58]">
          Source trace shows data provenance from the prediction pipeline. Missing entries mean the data was not recorded at ingestion time or the source is pending configuration.
        </p>
      </div>
    </SpatialSheet>
  );
}
