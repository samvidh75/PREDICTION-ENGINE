import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Bell, Calendar, LineChart, Plus, Search, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, radius } from "../design/tokens";

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
    <div className="raycast-slideUp" style={{ display: "grid", gap: "24px" }}>

      {/* ── Tab Bar ── */}
      <div className="raycast-stagger-1" style={{ display: "flex", gap: "4px", padding: "4px", background: colors.fill, borderRadius: radius.lg }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                transition: "all 150ms ease",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === "overview" && (
        <Card className="raycast-stagger-2" style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
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
            <Button variant="primary" size="sm" onClick={() => navigate("/scanner")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Search size={14} />
              Find Stocks
            </Button>
            <Button variant="tertiary" size="sm" onClick={() => navigate("/compare")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <BarChart3 size={14} />
              Compare
            </Button>
          </div>
        </Card>
      )}

      {/* ── Tab: Catalysts ── */}
      {activeTab === "catalysts" && (
        <Card className="raycast-stagger-2" style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
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
      )}

      {/* ── Tab: Alerts ── */}
      {activeTab === "alerts" && (
        <Card className="raycast-stagger-2" style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
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
            <Button variant="primary" size="sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={14} />
              Create Alert
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
