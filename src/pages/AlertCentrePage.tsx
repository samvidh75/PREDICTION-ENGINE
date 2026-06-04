import React, { useState, useCallback, useMemo } from 'react';
import { AlertEngine, SmartAlert, AlertCategory } from '../services/portfolio/AlertEngine';
import { Bell, X } from 'lucide-react';
import { PageHeader } from '../components/ui/DesignSystem';

function categoryColor(cat: AlertCategory): string {
  const map: Record<AlertCategory, string> = {
    Factor: 'border-[#2962ff]/30 text-[#7da0ff]',
    Risk: 'border-rose-400/30 text-rose-400',
    Momentum: 'border-amber-400/30 text-amber-400',
    News: 'border-violet-400/30 text-violet-400',
    Market: 'border-[#22ab94]/30 text-[#22ab94]',
  };
  return map[cat] || 'border-white/20 text-white/60';
}

function actionForCategory(cat: AlertCategory): string {
  const map: Record<AlertCategory, string> = {
    Factor: 'Review the company briefing to assess whether the factor change impacts your thesis.',
    Risk: 'Cross-check risk metrics against your portfolio allocation. Consider reducing exposure if concentration is high.',
    Momentum: 'Evaluate whether the momentum shift aligns with your holding period. Short-term moves may not warrant action.',
    News: 'Open the company timeline to review context. Not all news events require portfolio adjustments.',
    Market: 'Broad market shifts affect all holdings. Review diversification rather than reacting to individual positions.',
  };
  return map[cat] || 'Review the company page for additional context and data.';
}

export const AlertCentrePage: React.FC = () => {
  const [alerts, setAlerts] = useState<SmartAlert[]>(() => AlertEngine.getAlerts());
  const [filter, setFilter] = useState<AlertCategory | 'all'>('all');

  React.useEffect(() => {
    const handler = () => setAlerts([...AlertEngine.getAlerts()]);
    window.addEventListener('alertchange', handler);
    return () => window.removeEventListener('alertchange', handler);
  }, []);

  const markAllRead = useCallback(() => {
    AlertEngine.markAllAsRead();
    setAlerts([...AlertEngine.getAlerts()]);
  }, []);

  const dismiss = useCallback((id: string) => {
    AlertEngine.deleteAlert(id);
    setAlerts([...AlertEngine.getAlerts()]);
  }, []);

  const handleOpenCompany = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'stock');
    params.set('id', symbol);
    window.history.pushState({}, '', `?${params.toString()}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const filtered = useMemo(() => {
    let list = filter === 'all' ? alerts : alerts.filter(a => a.category === filter);
    return list.sort((a, b) => (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0));
  }, [alerts, filter]);

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const categories: AlertCategory[] = ['Factor', 'Risk', 'Momentum', 'News', 'Market'];

  return (
    <div className="w-full flex flex-col space-y-8 pb-12 text-white min-h-screen font-sans max-w-3xl mx-auto antialiased">
      <PageHeader
        title="Alerts"
        subtitle="What changed?"
        primaryAction={
          unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-[#7da0ff] hover:text-[#f0f3fa] bg-transparent border-none cursor-pointer"
            >
              Mark all as read
            </button>
          )
        }
      />

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition cursor-pointer ${
            filter === 'all' ? 'bg-[#2962ff] text-white border-[#2962ff]' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
          }`}
        >
          All ({alerts.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition cursor-pointer ${
              filter === cat ? 'bg-[#2962ff] text-white border-[#2962ff]' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/30 space-y-3">
          <Bell className="w-8 h-8" />
          <p className="text-sm">No alerts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(alert => (
            <div
              key={alert.id}
              className={`p-5 rounded-xl border transition-all ${
                alert.isRead ? 'bg-white/[0.01] border-white/5' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {!alert.isRead && <span className="w-2 h-2 rounded-full bg-[#2962ff]" />}
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${categoryColor(alert.category)}`}>
                    {alert.category}
                  </span>
                  <span className="text-[11px] font-mono text-white/30">{alert.symbol}</span>
                </div>
                <span className="text-[10px] text-white/30 font-mono">{alert.timestamp}</span>
              </div>

              {/* What changed */}
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">What happened</span>
                  <p className="text-sm font-semibold text-white leading-snug">{alert.title}</p>
                </div>

                {/* Why it matters */}
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Why it matters</span>
                  <p className="text-xs text-white/60 leading-relaxed">{alert.body.slice(0, 160)}</p>
                </div>

                {/* What to do */}
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[#7da0ff] block mb-1 font-semibold">What to do</span>
                  <p className="text-xs text-[#7da0ff]/70 leading-relaxed">{actionForCategory(alert.category)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => handleOpenCompany(alert.symbol)}
                  className="text-[11px] font-semibold text-[#7da0ff] hover:text-[#f0f3fa] bg-transparent border-none cursor-pointer"
                >
                  Open {alert.symbol}
                </button>
                <button onClick={() => dismiss(alert.id)} className="text-[11px] text-white/40 hover:text-white/70 bg-transparent border-none cursor-pointer">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertCentrePage;
