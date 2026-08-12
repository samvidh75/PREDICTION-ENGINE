import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Activity, Percent, Hash, Waves, TrendingUp, TrendingDown, BarChart3, Volume2, RefreshCw } from "lucide-react";
import { Card, CardLabel } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, typography, radius } from "../design/tokens";
import { alertEngine, type AlertDefinition, type AlertConditionType, type AlertRepeat } from "../services/alerts/AlertEngine";
import { MetricsSkeleton } from "../components/SkeletonLoader";

// ── Shared motion presets (mirrors ScannerPage/StockPage animation vocabulary) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

const CONDITION_OPTIONS: { value: AlertConditionType; label: string; icon: any }[] = [
  { value: "price_above", label: "Price Above", icon: TrendingUp },
  { value: "price_below", label: "Price Below", icon: TrendingDown },
  { value: "change_percent", label: "Change %", icon: Percent },
  { value: "rsi_oversold", label: "RSI Oversold", icon: Activity },
  { value: "rsi_overbought", label: "RSI Overbought", icon: Activity },
  { value: "macd_cross", label: "MACD Crossover", icon: BarChart3 },
  { value: "volume_spike", label: "Volume Spike", icon: Volume2 },
  { value: "bollinger_breakout", label: "Bollinger Breakout", icon: Waves },
  { value: "ma_cross", label: "MA Crossover", icon: Hash },
];

const REPEAT_OPTIONS: { value: AlertRepeat; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "always", label: "Always" },
];

function getConditionIcon(condition: AlertConditionType) {
  const opt = CONDITION_OPTIONS.find((c) => c.value === condition);
  return opt?.icon || AlertTriangle;
}

function formatDate(d: string | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-PH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ display: "grid", gap: 24 }}
    >
      <motion.section variants={fadeUp} transition={pageTransition} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Bell size={24} color={colors.accentBlue} /> Alerts
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: "4px 0 0" }}>
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setFormError(""); }}>
            <Plus size={14} /> {showForm ? "Cancel" : "New Alert"}
          </Button>
        </motion.div>
      </motion.section>

      {loading && (
        <motion.div variants={fadeUp} transition={pageTransition}>
          <MetricsSkeleton />
        </motion.div>
      )}

      {!loading && loadError && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={pageTransition}
          style={{
            maxWidth: 480, margin: "40px auto", padding: "32px", textAlign: "center",
            border: `1px solid ${colors.border}`, borderRadius: radius.lg, background: colors.card,
            display: "grid", gap: "12px", justifyItems: "center",
          }}
        >
          <div style={{
            width: "44px", height: "44px", borderRadius: radius.full, background: `${colors.warning}14`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle size={22} color={colors.warning} />
          </div>
          <div style={{ color: colors.textPrimary, fontSize: "15px", fontWeight: 600 }}>
            We couldn't load your alerts
          </div>
          <p style={{ color: colors.textSecondary, fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
            Something went wrong reading your saved alerts. This isn't a sign of lost data — just try again.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={loadAlerts}
            style={{
              marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: radius.full, border: `1px solid ${colors.border}`,
              background: colors.fill, color: colors.textPrimary, fontSize: "13px", fontWeight: 500, cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Try again
          </motion.button>
        </motion.div>
      )}

      {!loading && !loadError && showForm && (
        <motion.div
          initial={{ opacity: 0, y: 12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8 }}
          transition={pageTransition}
        >
        <Card>
          <div style={{ display: "grid", gap: 14 }}>
            <CardLabel>Create Alert</CardLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 120px", minWidth: 100 }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Symbol</span>
                <input value={formSymbol} onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. BDO"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Condition</span>
                <select value={formCondition} onChange={(e) => setFormCondition(e.target.value as AlertConditionType)}
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box", cursor: "pointer" }}
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Value</span>
                <input type="number" step="0.01" value={formValue} onChange={(e) => setFormValue(e.target.value)}
                  placeholder="0"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Repeat</span>
                <select value={formRepeat} onChange={(e) => setFormRepeat(e.target.value as AlertRepeat)}
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box", cursor: "pointer" }}
                >
                  {REPEAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Label</span>
                <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Optional label"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button variant="primary" size="sm" onClick={handleAdd}>
                  <Plus size={14} /> Create
                </Button>
              </motion.div>
            </div>
            {formError && <p style={{ fontSize: 12, color: colors.danger, margin: 0 }}>{formError}</p>}
          </div>
        </Card>
        </motion.div>
      )}

      {!loading && !loadError && alerts.length === 0 && !showForm && (
        <motion.div variants={fadeUp} transition={pageTransition}>
        <Card>
          <div style={{ textAlign: "center", padding: "48px 0", color: colors.textSecondary }}>
            <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No alerts configured yet</p>
            <p style={{ fontSize: 12, margin: "8px 0 0", color: colors.textTertiary }}>Create alerts for price movements, technical signals, and more</p>
          </div>
        </Card>
        </motion.div>
      )}

      {!loading && !loadError && alerts.length > 0 && (
        <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "grid", gap: 8 }}>
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const ConditionIcon = getConditionIcon(alert.condition);
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={pageTransition}
                >
                <Card style={{
                  padding: "14px 16px",
                  borderLeft: `3px solid ${alert.enabled ? colors.accentRed : colors.stone}`,
                  opacity: alert.enabled ? 1 : 0.5,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: radius.md,
                      background: alert.enabled ? colors.accentRedSoft : colors.backdropMuted,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <ConditionIcon size={14} color={alert.enabled ? colors.accentRed : colors.stone} />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{alert.symbol}</span>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: radius.full,
                          background: colors.backdropMuted, color: colors.textSecondary,
                        }}>
                          {alert.condition.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: 12, color: colors.textSecondary }}>→ {alert.value}</span>
                      </div>
                      <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                        {alert.label} · {alert.repeat} · Triggered {alert.triggeredCount}x · Last: {formatDate(alert.lastTriggeredAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <motion.button
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleToggle(alert)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: alert.enabled ? colors.marketGreen : colors.stone }}
                      >
                        {alert.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(alert.id)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: colors.stone }}
                        onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.stone}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>
                </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
