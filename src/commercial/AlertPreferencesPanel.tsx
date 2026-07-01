// src/commercial/AlertPreferencesPanel.tsx
// Phase 32 — Comprehensive alert preferences panel for premium users.
// Manages SMS, Email, and Telegram notification channels with granular alert type toggles.

import { useState, useEffect, useCallback } from "react";
import { colors, space, radius } from "../design/tokens";
import { useEntitlements } from "./useEntitlements";
import { FeatureGate } from "./FeatureGate";

interface AlertPreferencesPanelProps {
  userId: string;
}

interface AlertPreferences {
  user_id: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  telegram_enabled: boolean;
  phone_number: string | null;
  email_address: string | null;
  telegram_chat_id: string | null;
  breakout_alerts: boolean;
  volume_spike_alerts: boolean;
  trend_change_alerts: boolean;
  earnings_alerts: boolean;
  price_target_alerts: boolean;
  frequency: "real_time" | "daily_digest" | "weekly_summary";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULT_PREFS: AlertPreferences = {
  user_id: "",
  sms_enabled: false,
  email_enabled: false,
  telegram_enabled: false,
  phone_number: null,
  email_address: null,
  telegram_chat_id: null,
  breakout_alerts: true,
  volume_spike_alerts: true,
  trend_change_alerts: false,
  earnings_alerts: false,
  price_target_alerts: false,
  frequency: "real_time",
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export function AlertPreferencesPanel({ userId }: AlertPreferencesPanelProps) {
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState<string | null>(null);

  const { check } = useEntitlements();

  // Fetch existing preferences
  useEffect(() => {
    async function fetchPrefs() {
      try {
        const resp = await fetch(`/api/alert-preferences/${userId}`);
        if (resp.ok) {
          const data = await resp.json();
          setPrefs(data);
        }
      } catch (err) {
        console.error("Failed to fetch alert preferences:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, [userId]);

  // Save preferences
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const resp = await fetch(`/api/alert-preferences/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error ?? "Failed to save preferences");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [userId, prefs]);

  // Toggle a preference field
  const toggle = (field: keyof AlertPreferences) => {
    setPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Update a text field
  const updateField = (field: keyof AlertPreferences, value: string | null) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  // Style helpers
  const sectionStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.charcoal}`,
    borderRadius: radius.lg,
    padding: space[5],
    display: "flex",
    flexDirection: "column",
    gap: space[4],
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: colors.canvas,
    border: `1px solid ${colors.charcoal}`,
    borderRadius: radius.sm,
    padding: `${space[2]} ${space[3]}`,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: "monospace",
    outline: "none",
    boxSizing: "border-box",
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: active ? colors.accentRed : colors.charcoal,
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.2s",
    flexShrink: 0,
  });

  const toggleKnob = (active: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: colors.textPrimary,
    position: "absolute",
    top: 3,
    left: active ? 23 : 3,
    transition: "left 0.2s",
  });

  const channelButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? colors.accentRed : colors.surface,
    color: colors.textPrimary,
    border: `1px solid ${active ? colors.accentRed : colors.charcoal}`,
    borderRadius: radius.sm,
    padding: `${space[2]} ${space[3]}`,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  if (loading) {
    return (
      <div style={{ ...sectionStyle, alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <p style={{ color: colors.textTertiary, fontSize: 13 }}>Loading alert preferences...</p>
      </div>
    );
  }

  return (
    <FeatureGate feature="sms_alerts">
      <div style={{ display: "flex", flexDirection: "column", gap: space[5], maxWidth: 500 }}>
        {/* Header */}
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Alert Preferences
          </h3>
          <p style={{ fontSize: 13, color: colors.textTertiary, margin: `${space[1]} 0 0 0` }}>
            Configure how you receive breakout alerts and scanner notifications.
          </p>
        </div>

        {/* Delivery Channels */}
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
            Delivery Channels
          </h4>
          <p style={{ fontSize: 12, color: colors.textTertiary, margin: 0 }}>
            Enable at least one channel to receive alerts.
          </p>

          {/* SMS */}
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>SMS</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginLeft: space[2] }}>
                  Instant delivery
                </span>
              </div>
              <button onClick={() => toggle("sms_enabled")} style={toggleStyle(prefs.sms_enabled)}>
                <div style={toggleKnob(prefs.sms_enabled)} />
              </button>
            </div>
            {prefs.sms_enabled && (
              <input
                type="tel"
                placeholder="+919876543210"
                value={prefs.phone_number ?? ""}
                onChange={(e) => updateField("phone_number", e.target.value || null)}
                style={inputStyle}
              />
            )}
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>Email</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginLeft: space[2] }}>
                  Detailed reports
                </span>
              </div>
              <button onClick={() => toggle("email_enabled")} style={toggleStyle(prefs.email_enabled)}>
                <div style={toggleKnob(prefs.email_enabled)} />
              </button>
            </div>
            {prefs.email_enabled && (
              <input
                type="email"
                placeholder="you@example.com"
                value={prefs.email_address ?? ""}
                onChange={(e) => updateField("email_address", e.target.value || null)}
                style={inputStyle}
              />
            )}
          </div>

          {/* Telegram */}
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>Telegram</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginLeft: space[2] }}>
                  Free & unlimited
                </span>
              </div>
              <button onClick={() => toggle("telegram_enabled")} style={toggleStyle(prefs.telegram_enabled)}>
                <div style={toggleKnob(prefs.telegram_enabled)} />
              </button>
            </div>
            {prefs.telegram_enabled && (
              <input
                type="text"
                placeholder="@YourTelegramUsername"
                value={prefs.telegram_chat_id ?? ""}
                onChange={(e) => updateField("telegram_chat_id", e.target.value || null)}
                style={inputStyle}
              />
            )}
          </div>
        </div>

        {/* Alert Types */}
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
            Alert Types
          </h4>
          <p style={{ fontSize: 12, color: colors.textTertiary, margin: 0 }}>
            Choose which events trigger notifications.
          </p>

          {[
            { field: "breakout_alerts" as const, label: "Breakout Alerts", desc: "Volume + price breakouts" },
            { field: "volume_spike_alerts" as const, label: "Volume Spike", desc: "Unusual volume detection" },
            { field: "trend_change_alerts" as const, label: "Trend Change", desc: "Trend reversal signals" },
            { field: "earnings_alerts" as const, label: "Earnings Reminders", desc: "Earnings date alerts" },
            { field: "price_target_alerts" as const, label: "Price Targets", desc: "Target price hits" },
          ].map((item) => (
            <div key={item.field} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{item.label}</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginLeft: space[2] }}>
                  {item.desc}
                </span>
              </div>
              <button onClick={() => toggle(item.field)} style={toggleStyle(prefs[item.field])}>
                <div style={toggleKnob(prefs[item.field])} />
              </button>
            </div>
          ))}
        </div>

        {/* Frequency */}
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
            Delivery Frequency
          </h4>
          <div style={{ display: "flex", gap: space[2] }}>
            {[
              { value: "real_time" as const, label: "Real-time" },
              { value: "daily_digest" as const, label: "Daily Digest" },
              { value: "weekly_summary" as const, label: "Weekly" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField("frequency", opt.value)}
                style={channelButtonStyle(prefs.frequency === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
            Quiet Hours
          </h4>
          <p style={{ fontSize: 12, color: colors.textTertiary, margin: 0 }}>
            No alerts during these hours (optional).
          </p>
          <div style={{ display: "flex", gap: space[3], alignItems: "center" }}>
            <input
              type="time"
              placeholder="Start"
              value={prefs.quiet_hours_start ?? ""}
              onChange={(e) => updateField("quiet_hours_start", e.target.value || null)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <span style={{ color: colors.textTertiary }}>to</span>
            <input
              type="time"
              placeholder="End"
              value={prefs.quiet_hours_end ?? ""}
              onChange={(e) => updateField("quiet_hours_end", e.target.value || null)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <p style={{ color: colors.danger, fontSize: 12, margin: 0 }}>{error}</p>
        )}
        {saved && (
          <p style={{ color: colors.marketGreen, fontSize: 12, margin: 0 }}>
            Alert preferences saved successfully
          </p>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            background: saving ? colors.textTertiary : colors.accentRed,
            color: colors.textPrimary,
            border: "none",
            borderRadius: radius.md,
            padding: space[3],
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {saving ? "Saving..." : "Save Alert Preferences"}
        </button>
      </div>
    </FeatureGate>
  );
}
