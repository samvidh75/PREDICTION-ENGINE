import React from "react";

interface ProviderStatusCardProps {
  name: string;
  status: string;
  className?: string;
}

const providerLabels: Record<string, string> = {
  indianapi: "IndianAPI",
  redis: "Redis",
  screener: "Screener.in",
  moneycontrol: "Moneycontrol",
};

export default function ProviderStatusCard({ name, status, className = "" }: ProviderStatusCardProps) {
  const label = providerLabels[name.toLowerCase()] || name;

  const statusStyle = (() => {
    const s = status.toLowerCase();
    if (s === "healthy" || s === "active" || s === "connected" || s === "available")
      return { dot: "bg-accent-success", text: "text-accent-success", bg: "bg-accent-subtle border-accent-primary/20" };
    if (s === "deprecated" || s === "expired")
      return { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-200/40" };
    if (s === "unhealthy" || s === "disconnected" || s === "unavailable")
      return { dot: "bg-rose-400", text: "text-rose-700", bg: "bg-rose-50 border-rose-200/40" };
    return { dot: "bg-slate-300", text: "text-ink-muted", bg: "bg-[#0D1117]/60 border-white/30" };
  })();

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 border ${statusStyle.bg} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
      <span className="text-xs font-medium text-ink">{label}</span>
      <span className={`text-[11px] font-medium ${statusStyle.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}
