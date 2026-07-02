import { useState, useCallback } from "react";
import { colors, space, radius } from "../design/tokens";
import { useEntitlements } from "./useEntitlements";
import { FeatureGate } from "./FeatureGate";

interface AlertSettingsProps {
  userId: string;
}

export function AlertSettings({ userId }: AlertSettingsProps) {
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"SMS" | "WHATSAPP">("SMS");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const resp = await fetch("/api/checkout/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, phoneNumber: phone.trim(), preference: channel }),
      });

      if (!resp.ok) {
        const data = await resp.json() as { error?: string };
        throw new Error(data.error ?? "Failed to save preferences");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }, [userId, phone, channel]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: colors.canvas,
    border: `1px solid ${colors.charcoal}`,
    borderRadius: radius.sm,
    padding: `${space[2]} ${space[3]}`,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    outline: "none",
    boxSizing: "border-box",
  };

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

  return (
    <FeatureGate feature="sms_alerts">
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.charcoal}`,
        borderRadius: radius.lg,
        padding: space[5],
        display: "flex",
        flexDirection: "column",
        gap: space[4],
        maxWidth: 400,
      }}>
        <div>
          <h4 style={{
            fontSize: 15,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
          }}>
            Breakout Alert Delivery
          </h4>
          <p style={{
            fontSize: 12,
            color: colors.textTertiary,
            margin: `${space[1]} 0 0 0`,
          }}>
            Get real-time SMS or WhatsApp alerts when our SLM detects institutional breakouts.
          </p>
        </div>

        <div>
          <label style={{
            fontSize: 12,
            color: colors.textSecondary,
            display: "block",
            marginBottom: space[1],
          }}>
            Phone Number
          </label>
          <input
            type="tel"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(null); }}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{
            fontSize: 12,
            color: colors.textSecondary,
            display: "block",
            marginBottom: space[1],
          }}>
            Delivery Channel
          </label>
          <div style={{ display: "flex", gap: space[2] }}>
            <button
              onClick={() => setChannel("SMS")}
              style={channelButtonStyle(channel === "SMS")}
            >
              SMS
            </button>
            <button
              onClick={() => setChannel("WHATSAPP")}
              style={channelButtonStyle(channel === "WHATSAPP")}
            >
              WhatsApp
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: colors.danger, fontSize: 12, margin: 0 }}>{error}</p>
        )}

        {saved && (
          <p style={{ color: colors.marketGreen, fontSize: 12, margin: 0 }}>
            Preferences saved successfully
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? colors.textTertiary : colors.accentRed,
            color: colors.textPrimary,
            border: "none",
            borderRadius: radius.md,
            padding: space[3],
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Saving..." : "Save Alert Preferences"}
        </button>
      </div>
    </FeatureGate>
  );
}
