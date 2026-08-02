import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Bell, Calendar, LineChart, Plus, Search, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, radius } from "../design/tokens";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrackPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "catalysts" | "alerts">("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "catalysts" as const, label: "Catalysts", icon: Calendar },
    { id: "alerts" as const, label: "Alerts", icon: Bell },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ display: "grid", gap: "24px" }}
    >

      {/* ── Tab Bar ── */}
      <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "flex", gap: "4px", padding: "4px", background: colors.fill, borderRadius: radius.lg }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              style={{
                all: "unset",
                cursor: "pointer",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: radius.md,
                fontSize: "13px",
                fontWeight: 500,
                color: isActive ? colors.textPrimary : colors.textSecondary,
                background: isActive ? colors.bgSecondary : "transparent",
                transition: "background-color 150ms ease, color 150ms ease",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Tab: Overview ── */}
      {activeTab === "overview" && (
        <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition}>
        <Card style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: radius.full,
              background: `${colors.primary}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LineChart size={22} color={colors.primary} />
          </div>
          <div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
              No holdings tracked yet
            </p>
            <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "6px 0 0 0", maxWidth: "360px", lineHeight: 1.5 }}>
              Start building your portfolio by adding stocks you follow. Track catalysts, set alerts, and monitor your conviction scores.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Button variant="primary" size="sm" onClick={() => navigate("/scanner")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Search size={14} />
                Find Stocks
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Button variant="tertiary" size="sm" onClick={() => navigate("/compare")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <BarChart3 size={14} />
                Compare
              </Button>
            </motion.div>
          </div>
        </Card>
        </motion.div>
      )}

      {/* ── Tab: Catalysts ── */}
      {activeTab === "catalysts" && (
        <motion.div key="catalysts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition}>
        <Card style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: radius.full,
              background: `${colors.warning}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Calendar size={22} color={colors.warning} />
          </div>
          <div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
              No upcoming catalysts
            </p>
            <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "6px 0 0 0", maxWidth: "360px", lineHeight: 1.5 }}>
              Catalyst events for your tracked holdings will appear here — earnings dates, dividends, AGMs, and more.
            </p>
          </div>
        </Card>
        </motion.div>
      )}

      {/* ── Tab: Alerts ── */}
      {activeTab === "alerts" && (
        <motion.div key="alerts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition}>
        <Card style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: radius.full,
              background: `${colors.primary}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={22} color={colors.primary} />
          </div>
          <div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
              No alerts configured
            </p>
            <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "6px 0 0 0", maxWidth: "360px", lineHeight: 1.5 }}>
              Set up price and event alerts to get notified when something important happens with your holdings.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Button variant="primary" size="sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Plus size={14} />
                Create Alert
              </Button>
            </motion.div>
          </div>
        </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
