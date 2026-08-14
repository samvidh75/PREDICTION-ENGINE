import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Bell, Plus, Trash2, ChevronDown, Activity, Percent, Zap, TrendingUp, TrendingDown, BarChart3, Volume2, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { alertEngine, type AlertDefinition, type AlertConditionType, type AlertRepeat } from "../services/alerts/AlertEngine";
import { MetricsSkeleton } from "../components/SkeletonLoader";

const PALETTE = {
  primary: "#0B5FA5",    // Signature rust/amber
  success: "#0F9D58",    // Green
  danger: "#DC2626",     // Red
  bg: "#F5F6F8",         // Page background (warm paper)
  surface: "#FFFFFF",
  border: "#E2E5EA",
  text: "#0B0D12",
  textSecondary: "#374151",
  textTertiary: "#64748B",
};

const CONDITION_OPTIONS: { value: AlertConditionType; label: string; icon: any }[] = [
  { value: "price_above", label: "Price Above", icon: TrendingUp },
  { value: "price_below", label: "Price Below", icon: TrendingDown },
  { value: "change_percent", label: "Change %", icon: Percent },
  { value: "rsi_oversold", label: "RSI Oversold", icon: Activity },
  { value: "rsi_overbought", label: "RSI Overbought", icon: Activity },
  { value: "macd_cross", label: "MACD Cross", icon: BarChart3 },
  { value: "volume_spike", label: "Volume Spike", icon: Volume2 },
  { value: "bollinger_breakout", label: "BB Breakout", icon: Zap },
  { value: "ma_cross", label: "MA Cross", icon: BarChart3 },
];

const REPEAT_OPTIONS: { value: AlertRepeat; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "always", label: "Always" },
];

function getConditionIcon(condition: AlertConditionType) {
  const opt = CONDITION_OPTIONS.find((c) => c.value === condition);
  return opt?.icon || Activity;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function AlertPage() {
  const [alerts, setAlerts] = useState<AlertDefinition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formSymbol, setFormSymbol] = useState("");
  const [formCondition, setFormCondition] = useState<AlertConditionType>("price_above");
  const [formValue, setFormValue] = useState("");
  const [formRepeat, setFormRepeat] = useState<AlertRepeat>("once");
  const [formLabel, setFormLabel] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadAlerts = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    try {
      setAlerts(alertEngine.getAlerts());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleAdd = () => {
    setFormError("");
    const symbol = formSymbol.trim().toUpperCase();
    const value = parseFloat(formValue);
    if (!symbol) { setFormError("Enter a symbol"); return; }
    if (isNaN(value) || value <= 0) { setFormError("Enter a valid value"); return; }

    const label = formLabel.trim() || `${symbol} - ${formCondition.replace(/_/g, " ")}`;
    alertEngine.addAlert({
      symbol,
      condition: formCondition,
      value,
      repeat: formRepeat,
      label,
      enabled: true,
    });

    setFormSymbol(""); setFormValue(""); setFormLabel("");
    setShowForm(false);
    loadAlerts();
    toast.success(`Alert set — ${label}`);
  };

  const handleDelete = (id: string) => {
    const removed = alerts.find((a) => a.id === id);
    alertEngine.removeAlert(id);
    loadAlerts();
    toast(removed ? `Removed — ${removed.label}` : "Alert removed");
  };

  const handleToggle = (alert: AlertDefinition) => {
    alertEngine.updateAlert(alert.id, { enabled: !alert.enabled });
    loadAlerts();
    toast(alert.enabled ? `Paused — ${alert.label}` : `Resumed — ${alert.label}`);
  };

  return (
    <div style={{ display: "grid", gap: 16, padding: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 12, borderBottom: `1px solid ${PALETTE.border}` }}>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: PALETTE.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={18} color={PALETTE.primary} /> Alerts
          </h1>
          <p style={{ fontSize: "12px", color: PALETTE.textSecondary, margin: "2px 0 0", fontFamily: "monospace" }}>
            {alerts.length} configured
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setFormError(""); }} style={{ fontSize: "12px", height: "32px" }}>
          <Plus size={14} /> {showForm ? "Cancel" : "New"}
        </Button>
      </div>

      {loading && <MetricsSkeleton />}

      {!loading && loadError && (
        <div style={{
          border: `1px solid ${PALETTE.danger}40`,
          background: `${PALETTE.danger}08`,
          borderRadius: "4px",
          padding: "12px 14px",
          display: "grid",
          gap: "8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RefreshCw size={14} color={PALETTE.danger} />
            <span style={{ fontSize: "12px", color: PALETTE.text, fontWeight: 600 }}>Failed to load alerts</span>
          </div>
          <p style={{ fontSize: "11px", color: PALETTE.textSecondary, margin: 0 }}>Try again or check your connection</p>
          <button
            onClick={loadAlerts}
            style={{
              background: `${PALETTE.primary}20`,
              border: `1px solid ${PALETTE.primary}40`,
              color: PALETTE.primary,
              fontSize: "11px",
              fontWeight: 500,
              padding: "6px 10px",
              borderRadius: "3px",
              cursor: "pointer",
              marginTop: "4px",
              fontFamily: "monospace",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && showForm && (
        <div style={{
          border: `1px solid ${PALETTE.border}`,
          background: PALETTE.surface,
          borderRadius: "4px",
          padding: "12px 14px",
          display: "grid",
          gap: "10px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: PALETTE.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>Create Alert</div>
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              <div>
                <label style={{ fontSize: "10px", color: PALETTE.textTertiary, display: "block", marginBottom: "4px", textTransform: "uppercase", fontFamily: "monospace" }}>Symbol</label>
                <input
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  placeholder="BDO"
                  style={{
                    height: "32px",
                    width: "100%",
                    borderRadius: "3px",
                    border: `1px solid ${PALETTE.border}`,
                    padding: "0 8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: PALETTE.text,
                    background: PALETTE.bg,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "10px", color: PALETTE.textTertiary, display: "block", marginBottom: "4px", textTransform: "uppercase", fontFamily: "monospace" }}>Condition</label>
                <select
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value as AlertConditionType)}
                  style={{
                    height: "32px",
                    width: "100%",
                    borderRadius: "3px",
                    border: `1px solid ${PALETTE.border}`,
                    padding: "0 8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: PALETTE.text,
                    background: PALETTE.bg,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "10px", color: PALETTE.textTertiary, display: "block", marginBottom: "4px", textTransform: "uppercase", fontFamily: "monospace" }}>Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="0"
                  style={{
                    height: "32px",
                    width: "100%",
                    borderRadius: "3px",
                    border: `1px solid ${PALETTE.border}`,
                    padding: "0 8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: PALETTE.text,
                    background: PALETTE.bg,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "10px", color: PALETTE.textTertiary, display: "block", marginBottom: "4px", textTransform: "uppercase", fontFamily: "monospace" }}>Repeat</label>
                <select
                  value={formRepeat}
                  onChange={(e) => setFormRepeat(e.target.value as AlertRepeat)}
                  style={{
                    height: "32px",
                    width: "100%",
                    borderRadius: "3px",
                    border: `1px solid ${PALETTE.border}`,
                    padding: "0 8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: PALETTE.text,
                    background: PALETTE.bg,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {REPEAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "10px", color: PALETTE.textTertiary, display: "block", marginBottom: "4px", textTransform: "uppercase", fontFamily: "monospace" }}>Label</label>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Optional"
                  style={{
                    height: "32px",
                    width: "100%",
                    borderRadius: "3px",
                    border: `1px solid ${PALETTE.border}`,
                    padding: "0 8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: PALETTE.text,
                    background: PALETTE.bg,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {formError && <div style={{ fontSize: "11px", color: PALETTE.danger, fontFamily: "monospace", fontWeight: 500 }}>{formError}</div>}
            <Button variant="primary" size="sm" onClick={handleAdd} style={{ fontSize: "12px", height: "32px", alignSelf: "flex-start" }}>
              <Plus size={12} /> Create
            </Button>
          </div>
        </div>
      )}

      {!loading && !loadError && alerts.length === 0 && !showForm && (
        <div style={{
          border: `1px solid ${PALETTE.border}`,
          background: `${PALETTE.surface}40`,
          borderRadius: "4px",
          padding: "32px 16px",
          textAlign: "center",
          color: PALETTE.textTertiary,
        }}>
          <Bell size={28} style={{ opacity: 0.4, marginBottom: 8, display: "block" }} />
          <p style={{ fontSize: "12px", margin: 0, fontWeight: 500 }}>No alerts configured</p>
          <p style={{ fontSize: "11px", margin: "4px 0 0", color: PALETTE.textTertiary }}>Create alerts for price movements and technical signals</p>
        </div>
      )}

      {!loading && !loadError && alerts.length > 0 && (
        <div style={{ display: "grid", gap: "1px", border: `1px solid ${PALETTE.border}`, borderRadius: "4px", overflow: "hidden" }}>
          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1.5fr 0.8fr 0.6fr 0.6fr 0.4fr",
            gap: "12px",
            padding: "8px 12px",
            background: `${PALETTE.surface}60`,
            borderBottom: `1px solid ${PALETTE.border}`,
            fontSize: "10px",
            fontFamily: "monospace",
            fontWeight: 600,
            color: PALETTE.textTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            <div>Alert</div>
            <div>Condition</div>
            <div>Value</div>
            <div>Repeat</div>
            <div>Count</div>
            <div>Last</div>
            <div style={{ textAlign: "center" }}>Actions</div>
          </div>

          {/* Table Rows */}
          {alerts.map((alert) => {
            const ConditionIcon = getConditionIcon(alert.condition);
            const statusColor = alert.enabled ? PALETTE.primary : PALETTE.textTertiary;
            return (
              <div
                key={alert.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1.5fr 0.8fr 0.6fr 0.6fr 0.4fr",
                  gap: "12px",
                  padding: "10px 12px",
                  borderBottom: `1px solid ${PALETTE.border}`,
                  background: alert.enabled ? PALETTE.bg : `${PALETTE.bg}80`,
                  opacity: alert.enabled ? 1 : 0.6,
                  alignItems: "center",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: PALETTE.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: "3px",
                    background: `${statusColor}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <ConditionIcon size={10} color={statusColor} />
                  </div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 700, color: PALETTE.text }}>{alert.symbol}</div>
                    <div style={{ fontSize: "10px", color: PALETTE.textSecondary, marginTop: "1px" }}>{alert.label}</div>
                  </div>
                </div>

                <div style={{ color: PALETTE.textSecondary, fontSize: "11px" }}>
                  {alert.condition.replace(/_/g, " ")}
                </div>

                <div style={{ fontWeight: 600, color: statusColor }}>
                  {alert.value.toFixed(2)}
                </div>

                <div style={{ color: PALETTE.textSecondary, textTransform: "capitalize" }}>
                  {alert.repeat}
                </div>

                <div style={{ textAlign: "center", color: PALETTE.textSecondary }}>
                  {alert.triggeredCount}
                </div>

                <div style={{ color: PALETTE.textSecondary, fontSize: "11px" }}>
                  {formatDate(alert.lastTriggeredAt)}
                </div>

                <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                  <button
                    onClick={() => handleToggle(alert)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: alert.enabled ? PALETTE.success : PALETTE.textTertiary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = alert.enabled ? PALETTE.success : PALETTE.textSecondary}
                    onMouseLeave={(e) => e.currentTarget.style.color = alert.enabled ? PALETTE.success : PALETTE.textTertiary}
                  >
                    {alert.enabled ? "●" : "○"}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: PALETTE.textTertiary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = PALETTE.danger}
                    onMouseLeave={(e) => e.currentTarget.style.color = PALETTE.textTertiary}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
