import React, { useState } from "react";

interface FinancialRow {
  label: string;
  values: (number | null)[];
}

interface FinancialTablesWidgetProps {
  rows: FinancialRow[];
  periods: string[];
  loading?: boolean;
}

function formatCell(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export const FinancialTablesWidget: React.FC<FinancialTablesWidgetProps> = ({ rows, periods, loading }) => {
  const [viewMode, setViewMode] = useState<"table" | "compact">("table");

  if (loading) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse space-y-2"><div className="h-4 w-48 bg-[var(--color-surface-elevated)] rounded" /><div className="h-20 bg-[var(--color-surface-elevated)] rounded" /></div>;
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-xs text-[var(--color-text-muted)]">Financial statements are not yet available.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Financial Statements</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setViewMode("table")} className={`px-2 py-0.5 text-[10px] rounded ${viewMode === "table" ? "bg-[#2962FF] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>Table</button>
          <button type="button" onClick={() => setViewMode("compact")} className={`px-2 py-0.5 text-[10px] rounded ${viewMode === "compact" ? "bg-[#2962FF] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>Compact</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="sticky left-0 bg-[var(--color-surface)] px-3 py-2 text-left text-[10px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap min-w-[120px]">Line Item</th>
              {periods.map((p) => (
                <th key={p} className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? "bg-[rgba(15,23,42,0.02)]" : ""}>
                <td className="sticky left-0 bg-[var(--color-surface)] px-3 py-2 text-left text-[11px] font-medium text-[var(--color-text-primary)] whitespace-nowrap">{row.label}</td>
                {row.values.map((v, j) => (
                  <td key={j} className="px-3 py-2 text-right font-mono tabular-nums text-[11px] text-[var(--color-text-primary)]">{v !== null ? (viewMode === "compact" ? (v >= 0 ? "✓" : "✗") : formatCell(v)) : "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialTablesWidget;
