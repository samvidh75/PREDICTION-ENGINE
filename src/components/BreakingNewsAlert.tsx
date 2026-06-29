/**
 * BreakingNewsAlert — Toast notification component for breaking news.
 * 
 * Auto-dismisses after 8s. Shows sentiment badge, relevance score, source, and timestamp.
 * Stacks multiple alerts if more than one arrives.
 * 
 * Spec ref: Section "Breaking News Alerts" — real-time toast notifications.
 */

import { useState, useEffect, useCallback } from "react";
import { Bell, TrendingUp, TrendingDown, X, ExternalLink, Clock } from "lucide-react";
import { colors, radius, animation } from "../design/tokens";

export interface BreakingNewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: Date;
  sentiment: "positive" | "negative" | "neutral";
  relevanceScore: number; // 0-100 how relevant to tracked stocks
  url?: string;
  autoDismiss?: boolean;
}

interface BreakingNewsAlertProps {
  /** Array of active alerts — managed by a global context or zustand store */
  alerts: BreakingNewsItem[];
  onDismiss: (id: string) => void;
}

const SENTIMENT_CONFIG = {
  positive: { color: colors.marketGreen, bg: colors.marketGreenSoft, icon: <TrendingUp size={12} /> },
  negative: { color: colors.marketRed, bg: colors.marketRedSoft, icon: <TrendingDown size={12} /> },
  neutral: { color: colors.marketOrange, bg: colors.marketOrangeSoft, icon: <Bell size={12} /> },
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function BreakingNewsAlert({ alerts, onDismiss }: BreakingNewsAlertProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "400px",
        width: "100%",
        pointerEvents: "auto",
      }}
    >
      {alerts.map((alert) => (
        <BreakingNewsToast key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function BreakingNewsToast({
  alert,
  onDismiss,
}: {
  alert: BreakingNewsItem;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const sentiment = SENTIMENT_CONFIG[alert.sentiment];

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (alert.autoDismiss === false) return;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(alert.id), 300);
    }, 8000);
    return () => clearTimeout(timer);
  }, [alert.id, alert.autoDismiss, onDismiss]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(alert.id), 300);
  }, [alert.id, onDismiss]);

  const handleClick = () => {
    if (alert.url) {
      window.open(alert.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        background: colors.surface,
        border: `1px solid ${colors.hairlineStrong}`,
        borderRadius: radius.lg,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        cursor: alert.url ? "pointer" : "default",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateX(100%)" : "translateX(0)",
        transition: `all ${animation.fast}`,
        animation: exiting ? "none" : "slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onClick={alert.url ? handleClick : undefined}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.xs,
              background: sentiment.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: sentiment.color }}>{sentiment.icon}</span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: sentiment.color,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Breaking News
          </span>
          <span
            style={{
              fontSize: "10px",
              color: colors.textTertiary,
              background: colors.surfaceCard,
              padding: "1px 6px",
              borderRadius: radius.full,
            }}
          >
            {alert.relevanceScore}% relevant
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          style={{
            background: "none",
            border: "none",
            color: colors.textTertiary,
            cursor: "pointer",
            padding: "2px",
            borderRadius: radius.xs,
          }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: colors.textPrimary,
          lineHeight: "1.5",
          marginBottom: "6px",
        }}
      >
        {alert.headline}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "11px", color: colors.textSecondary }}>
          {alert.source}
        </span>
        <span style={{ color: colors.textTertiary, fontSize: "11px" }}>·</span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: colors.textTertiary }}>
          <Clock size={10} />
          {timeAgo(alert.timestamp)}
        </span>
        {alert.url && (
          <>
            <span style={{ color: colors.textTertiary, fontSize: "11px" }}>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", color: colors.accentRed, fontWeight: 500 }}>
              Read <ExternalLink size={10} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage breaking news alerts in a component.
 * Usage: const { alerts, addAlert, dismissAlert } = useBreakingNews();
 */
export function useBreakingNews() {
  const [alerts, setAlerts] = useState<BreakingNewsItem[]>([]);

  const addAlert = useCallback((alert: Omit<BreakingNewsItem, "id" | "timestamp"> & { id?: string; timestamp?: Date }) => {
    const id = alert.id ?? `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = alert.timestamp ?? new Date();
    setAlerts((prev) => [{ ...alert, id, timestamp } as BreakingNewsItem, ...prev].slice(0, 5));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, addAlert, dismissAlert, clearAll };
}
