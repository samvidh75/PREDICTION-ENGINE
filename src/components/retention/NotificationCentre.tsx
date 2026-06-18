/**
 * TRACK-87 — NotificationCentre
 * Bell icon with unread count, notification page drawer.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, AlertTriangle, TrendingUp, TrendingDown, Activity, Zap, Sparkles } from 'lucide-react';

interface Alert {
  id: number;
  user_id: string;
  symbol: string;
  alert_type: string;
  title: string;
  body: string;
  is_read: number;
  created_at: string;
}

export const NotificationCentre: React.FC<{ userId?: string }> = ({ userId = 'anonymous' }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts?uid=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const markAsRead = async (alertId: number) => {
    await fetch(`/api/alerts/${alertId}/read`, { method: 'POST' });
    fetchAlerts();
  };

  const markAllAsRead = async () => {
    await fetch(`/api/alerts/read-all?uid=${encodeURIComponent(userId)}`, { method: 'POST' });
    fetchAlerts();
  };

  const alertIcon = (type: string) => {
    switch (type) {
      case 'prediction_upgrade': return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case 'prediction_downgrade': return <TrendingDown className="h-4 w-4 text-rose-400" />;
      case 'health_change': return <Activity className="h-4 w-4 text-amber-400" />;
      case 'confidence_change': return <Zap className="h-4 w-4 text-indigo-400" />;
      case 'new_opportunity': return <Sparkles className="h-4 w-4 text-cyan-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-white/40" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr + 'Z').getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-white/60" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-semibold text-white shadow-lg shadow-cyan-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0A0F17] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-bold uppercase text-cyan-400 hover:text-cyan-300">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-white/[0.05]">
                  <X className="h-4 w-4 text-white/40" />
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="flex-1 overflow-y-auto">
              {loading && alerts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-10 w-10 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">No notifications yet</p>
                  <p className="text-xs text-white/15 mt-1">Alerts will appear here when predictions change</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`flex gap-3 p-4 transition-colors hover:bg-white/[0.02] ${!alert.is_read ? 'bg-cyan-500/[0.03]' : ''}`}
                      onClick={() => !alert.is_read && markAsRead(alert.id)}
                    >
                      <div className="mt-0.5 shrink-0">{alertIcon(alert.alert_type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-bold ${!alert.is_read ? 'text-white' : 'text-white/60'}`}>{alert.title}</p>
                          <span className="shrink-0 text-[10px] text-white/20">{timeAgo(alert.created_at)}</span>
                        </div>
                        <p className={`mt-1 text-[11px] leading-relaxed ${!alert.is_read ? 'text-white/70' : 'text-white/40'}`}>
                          {alert.body}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400">{alert.symbol}</span>
                          <span className="text-[9px] text-white/20 uppercase">{alert.alert_type.replace(/_/g, ' ')}</span>
                          {!alert.is_read && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCentre;
