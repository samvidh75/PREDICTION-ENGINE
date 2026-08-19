import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { colors, radius, space, typography } from "../design/tokens";
import { getProfile, resetProfile, updateDisplayName, updateExperienceLevel, updateMaxRiskLevel, updateResearchTopics, updateTimeHorizon } from "../services/personalization/researchProfileStore";
import { loadAuthSession } from "../services/auth/sessionStore";
import { clearActionMemory } from "../services/personalization/UserActionMemory";
import { clearAllAlerts } from "../services/personalization/AlertStore";
import { clearAllPresets } from "../services/personalization/ScannerPresetStore";
import { PortfolioEngine } from "../services/portfolio/PortfolioEngine";
import { getWatchlists, saveWatchlists } from "../services/portfolio/watchlistStore";
import { subscribeProfile } from "../services/personalization/researchProfileStore";

type ResetScope = "profile" | "workspace" | null;

const TOPIC_OPTIONS = [
  "Financials",
  "Industrial",
  "Holding Firms",
  "Property",
  "Services",
  "Mining & Oil",
  "Consumer",
  "Technology",
  "Utilities",
  "ETF",
];

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <div style={{ display: "grid", gap: space[4] }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h2 style={{ margin: 0, color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: 700 }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{description}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? colors.primary : colors.charcoal}`,
        background: active ? colors.surfaceElevated : colors.surface,
        color: colors.textPrimary,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const session = loadAuthSession();
  const [profileVersion, setProfileVersion] = useState(0);
  const [resetScope, setResetScope] = useState<ResetScope>(null);
  const profile = getProfile();

  useEffect(() => subscribeProfile(() => setProfileVersion((v) => v + 1)), []);

  const watchlists = getWatchlists();
  const holdings = PortfolioEngine.getHoldings();

  const exportSettings = () => {
    const payload = {
      session,
      profile,
      watchlists,
      holdings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stockex-settings-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearProfile = () => {
    resetProfile();
    setProfileVersion((v) => v + 1);
  };

  const clearWorkspace = () => {
    PortfolioEngine.clearHoldings();
    clearAllAlerts();
    clearAllPresets();
    clearActionMemory();
    saveWatchlists([]);
    setResetScope("workspace");
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              color: colors.textSecondary,
              cursor: "pointer",
              padding: 0,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: "grid", gap: 6 }}>
            <h1 style={{ margin: 0, color: colors.textPrimary, fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700 }}>
              Settings
            </h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14, lineHeight: 1.6, maxWidth: 720 }}>
              Manage the local research profile and workspace state used by StockEX. This page only edits the data this app actually stores.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm" onClick={exportSettings}>
            <Download size={14} /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setProfileVersion((v) => v + 1)}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Card>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Account</div>
            <div style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{session.displayName || profile.displayName || "Unnamed researcher"}</div>
            <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
              {session.email || "No email session loaded"}
            </div>
            <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
              {session.uid ? `UID: ${session.uid}` : "Anonymous session"}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Workspace</div>
            <div style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{watchlists.length} watchlist{watchlists.length === 1 ? "" : "s"}</div>
            <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{holdings.length} portfolio holding{holdings.length === 1 ? "" : "s"}</div>
            <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>All of this is local-first and may sync if you are signed in.</div>
          </div>
        </Card>
      </div>

      <Section
        title="Research profile"
        description="These preferences feed the personalization layer used by the research workspace and saved locally per account."
      >
        <div style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Display name</span>
            <input
              value={profile.displayName ?? ""}
              onChange={(e) => updateDisplayName(e.target.value)}
              placeholder="Enter a display name"
              style={{
                height: 40,
                borderRadius: radius.sm,
                border: `1px solid ${colors.charcoal}`,
                padding: "0 12px",
                background: colors.canvas,
                color: colors.textPrimary,
                fontSize: 14,
                outline: "none",
              }}
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Experience</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                <Pill key={level} active={profile.experienceLevel === level} onClick={() => updateExperienceLevel(level)}>
                  {level}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Time horizon</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["short_term", "medium_term", "long_term"] as const).map((horizon) => (
                <Pill key={horizon} active={profile.timeHorizon === horizon} onClick={() => updateTimeHorizon(horizon)}>
                  {horizon.replace("_", " ")}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Risk tolerance</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["High", "Moderate", "Low"] as const).map((level) => (
                <Pill key={level} active={profile.maxRiskLevel === level} onClick={() => updateMaxRiskLevel(level)}>
                  {level}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Topics of interest</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TOPIC_OPTIONS.map((topic) => {
                const active = profile.researchTopics.includes(topic);
                return (
                  <Pill
                    key={topic}
                    active={active}
                    onClick={() => {
                      const next = active ? profile.researchTopics.filter((item) => item !== topic) : [...profile.researchTopics, topic];
                      updateResearchTopics(next);
                    }}
                  >
                    {topic}
                  </Pill>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Local data controls"
        description="These actions only affect the device and account-local research data stored in this browser. Nothing here places orders or deletes any backend account record."
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${colors.charcoal}` }}>
            <div>
              <div style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>Reset research profile</div>
              <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>Clears display name, experience, horizon, risk, and topic preferences for this account.</div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearProfile}>
              <Trash2 size={14} /> Reset
            </Button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${colors.charcoal}` }}>
            <div>
              <div style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>Clear workspace memory</div>
              <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>Removes portfolio holdings, alerts, scanner presets, action memory, and saved watchlists from this browser/account.</div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearWorkspace}>
              <ShieldAlert size={14} /> Clear workspace
            </Button>
          </div>
        </div>

        {resetScope === "workspace" && (
          <div style={{ color: colors.success, fontSize: 13, fontWeight: 600 }}>Workspace cleared on this device.</div>
        )}
      </Section>

      <Card>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>
            <Sparkles size={14} /> Notes
          </div>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: 13, lineHeight: 1.7 }}>
            Settings is a permanent repo-owned surface now. It reuses the same local data stores that power watchlist, portfolio, alerts, and personalization elsewhere in the app.
          </p>
        </div>
      </Card>
    </div>
  );
}