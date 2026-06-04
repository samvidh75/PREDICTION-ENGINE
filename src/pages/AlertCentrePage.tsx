import React, { useState, useCallback, useMemo } from "react";
import { AlertEngine, SmartAlert, AlertCategory } from "../services/portfolio/AlertEngine";
import { Bell, Check, CheckCheck, Trash2, Pin, Archive } from "lucide-react";

type AlertFilter = "all" | AlertCategory;
type AlertStatusFilter = "all" | "unread" | "read" | "archived";

interface StructuredAlertContent {
  whatHappened: string;
  whyMatters: string;
  suggestedStep: string;
  linkId?: string;
}

export const AlertCentrePage: React.FC = () => {
  const [alerts, setAlerts] = useState<SmartAlert[]>(() => AlertEngine.getAlerts());
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<AlertFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("all");

  React.useEffect(() => {
    const handleSync = () => {
      setAlerts([...AlertEngine.getAlerts()]);
    };
    window.addEventListener("alertchange", handleSync);
    return () => window.removeEventListener("alertchange", handleSync);
  }, []);

  const refresh = useCallback(() => setAlerts([...AlertEngine.getAlerts()]), []);

  const markRead = useCallback((id: string) => {
    AlertEngine.markAsRead(id);
    refresh();
  }, [refresh]);

  const markAllRead = useCallback(() => {
    AlertEngine.markAllAsRead();
    refresh();
  }, [refresh]);

  const deleteAlert = useCallback((id: string) => {
    AlertEngine.deleteAlert(id);
    refresh();
  }, [refresh]);

  const toggleArchive = useCallback((id: string) => {
    setArchivedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleNavigateToCompany = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const getStructuredContent = (alert: SmartAlert): StructuredAlertContent => {
    const body = alert.body;
    const symbol = alert.symbol;

    if (symbol === "RELIANCE") {
      return {
        whatHappened: "Reliance factor rating was upgraded to High Health as operating margins consolidate.",
        whyMatters: "Digital services operating efficiencies are compensating for commodity price declines, proving business quality resilience.",
        suggestedStep: "Analyze Business Quality score on Reliance detail report.",
        linkId: "RELIANCE"
      };
    }
    if (symbol === "INFY") {
      return {
        whatHappened: "Infosys is showing minor risk exposure drift due to tech sector volatility adjustments.",
        whyMatters: "Client spending revisions in North America are putting short-term pressure on margins stability.",
        suggestedStep: "Audit Risk checklists and Valuation charts.",
        linkId: "INFY"
      };
    }
    if (symbol === "HAL") {
      return {
        whatHappened: "HAL cleared significant government project clearances, stabilizing domestic manufacturing timelines.",
        whyMatters: "A massive order book backlog gets execution visibility, ensuring long-term revenue safety.",
        suggestedStep: "Check corporate Catalysts Timeline details.",
        linkId: "HAL"
      };
    }
    if (symbol === "HDFCBANK") {
      return {
        whatHappened: "HDFC Bank pricing expanded beyond the 50-day moving average with supportive retail volumes.",
        whyMatters: "Signals structural consolidation phase is ending and institutional participation is turning bullish.",
        suggestedStep: "Explore current Ownership Flow trends.",
        linkId: "HDFCBANK"
      };
    }
    if (symbol === "NIFTY50" || symbol === "NIFTY" || body.toLowerCase().includes("nifty")) {
      return {
        whatHappened: "Broad Indian indices entered a BULL regime with 82% of tickers trading above their 50-day average.",
        whyMatters: "Positive breadth shifts reduce tail risk across all holdings.",
        suggestedStep: "View Portfolio weight metrics to check diversification balance.",
      };
    }

    // Fallback if custom alerts are generated dynamically
    return {
      whatHappened: body,
      whyMatters: `This structural change impacts the stock's fundamental rating in the ${alert.category} category.`,
      suggestedStep: `Review details for ${symbol} on the research workspace.`,
      linkId: symbol
    };
  };

  const categories: AlertCategory[] = ["Factor", "Risk", "Momentum", "News", "Market"];

  const filtered = useMemo(() => {
    let list = alerts;
    if (categoryFilter !== "all") list = list.filter(a => a.category === categoryFilter);
    if (statusFilter === "unread") list = list.filter(a => !a.isRead && !archivedIds.has(a.id));
    else if (statusFilter === "read") list = list.filter(a => a.isRead && !archivedIds.has(a.id));
    else if (statusFilter === "archived") list = list.filter(a => archivedIds.has(a.id));
    else list = list.filter(a => !archivedIds.has(a.id));

    return list.sort((a, b) => {
      const ap = pinnedIds.has(a.id) ? 0 : 1;
      const bp = pinnedIds.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }, [alerts, categoryFilter, statusFilter, archivedIds, pinnedIds]);

  const unreadCount = alerts.filter(a => !a.isRead && !archivedIds.has(a.id)).length;

  const categoryColor: Record<AlertCategory, string> = {
    Factor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    Risk: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    Momentum: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    News: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    Market: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  };

  return (
    <div className="w-full flex flex-col space-y-6 select-none p-6 md:p-8 bg-[#020304] text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 block mb-1">
            Intelligence Alerts
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Alert Centre
          </h1>
          <p className="mt-1 text-xs text-white/40 font-mono">
            {unreadCount} unread · {alerts.length} total
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="h-8 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[11px] font-medium text-white/70 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer font-mono ${
            categoryFilter === "all"
              ? "bg-white text-black border-white"
              : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10"
          }`}
        >
          All Types
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer font-mono ${
              categoryFilter === cat
                ? "bg-white text-black border-white"
                : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
        <div className="w-px h-7 bg-white/10 mx-1" />
        {(["all", "unread", "read", "archived"] as AlertStatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer font-mono ${
              statusFilter === s
                ? "bg-white text-black border-white"
                : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="flex flex-col space-y-4">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white/30">
            <Bell className="w-8 h-8 mb-3 opacity-30 animate-bounce" />
            <span className="text-sm font-medium">No alerts match your filters</span>
            <span className="text-xs mt-1">Adjust your filters or check back later</span>
          </div>
        )}
        {filtered.map(alert => {
          const content = getStructuredContent(alert);
          return (
            <div
              key={alert.id}
              className={`group relative p-5 rounded-2xl border transition-all ${
                alert.isRead
                  ? "bg-white/[0.01] border-white/5"
                  : "bg-white/[0.03] border-white/10"
              } ${pinnedIds.has(alert.id) ? "ring-1 ring-amber-400/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    {!alert.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${categoryColor[alert.category]}`}>
                      {alert.category}
                    </span>
                    {pinnedIds.has(alert.id) && (
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider font-mono">Pinned</span>
                    )}
                    <span className="text-[10px] text-white/30 ml-auto shrink-0 font-mono">{alert.timestamp}</span>
                  </div>
                  
                  <h3 className="text-sm font-bold text-white mb-3">{alert.title}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-black/40 border border-white/5 p-4 rounded-xl">
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase font-mono block mb-1">What Happened</span>
                      <p className="text-gray-250 leading-relaxed">{content.whatHappened}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase font-mono block mb-1">Why It Matters</span>
                      <p className="text-gray-250 leading-relaxed">{content.whyMatters}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase font-mono block mb-1 font-semibold text-cyan-400">Suggested Step</span>
                      <p 
                        onClick={() => content.linkId && handleNavigateToCompany(content.linkId)}
                        className={`text-cyan-400 leading-relaxed ${content.linkId ? 'cursor-pointer hover:underline font-semibold' : ''}`}
                      >
                        {content.suggestedStep}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/20 mt-3 block font-mono">Ticker Context: {alert.symbol}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!alert.isRead && (
                    <button
                      onClick={() => markRead(alert.id)}
                      title="Mark read"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => togglePin(alert.id)}
                    title={pinnedIds.has(alert.id) ? "Unpin" : "Pin"}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                      pinnedIds.has(alert.id)
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleArchive(alert.id)}
                    title="Archive"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    title="Delete"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-rose-500/10 text-white/40 hover:text-rose-450 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertCentrePage;
