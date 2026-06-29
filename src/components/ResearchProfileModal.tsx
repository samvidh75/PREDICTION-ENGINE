import { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import type { UserResearchProfile, ResearchExperienceLevel, ResearchTimeHorizon, RiskLevel } from "../research/contracts/productContracts";
import { getProfile, saveProfile, updateExperienceLevel, updateTimeHorizon, updateMaxRiskLevel, updateResearchTopics, updateDisplayName } from "../services/personalization/researchProfileStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { colors, typography, space, shadows } from "../design/tokens";

const EXPERIENCE_OPTIONS: ResearchExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const HORIZON_OPTIONS: ResearchTimeHorizon[] = ["short_term", "medium_term", "long_term"];
const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "High"];

const TOPIC_OPTIONS = [
  "Technology", "Banking", "Pharma", "Auto",
  "FMCG", "Energy", "Metals", "Real Estate",
  "Telecom", "Infrastructure",
];

export function ResearchProfileModal() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserResearchProfile | null>(null);

  useEffect(() => {
    if (open) setProfile(getProfile());
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: colors.textSecondary,
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Research profile settings"
      >
        <Settings size={20} strokeWidth={1.75} />
      </button>
    );
  }

  if (!profile) return null;

  const handleToggleTopic = (topic: string) => {
    const next = profile.researchTopics?.includes(topic)
      ? (profile.researchTopics ?? []).filter((t) => t !== topic)
      : [...(profile.researchTopics ?? []), topic];
    updateResearchTopics(next);
    setProfile(getProfile());
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: colors.backdropModal,
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "90vw",
          maxWidth: "520px",
          maxHeight: "80vh",
          overflowY: "auto",
          background: colors.page,
          borderRadius: "16px",
          boxShadow: shadows.elevated,
        }}
      >
        <Card>
          <div style={{ display: "grid", gap: space[6] }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{
                margin: 0,
                color: colors.textPrimary,
                fontSize: typography.h3.desktop.size,
                fontWeight: 600,
              }}>
                Research Profile
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.textSecondary,
                  padding: space[1],
                }}
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>

            {/* Display Name */}
            <div style={{ display: "grid", gap: space[2] }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
                Display Name
              </label>
              <input
                value={profile.displayName ?? ""}
                onChange={(e) => { updateDisplayName(e.target.value); setProfile(getProfile()); }}
                style={{
                  minHeight: "40px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  padding: "0 12px",
                  fontSize: typography.body.desktop.size,
                  color: colors.textPrimary,
                  background: colors.card,
                  outline: "none",
                }}
              />
            </div>

            {/* Experience Level */}
            <div style={{ display: "grid", gap: space[2] }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
                Experience Level
              </label>
              <div style={{ display: "flex", gap: space[2] }}>
                {EXPERIENCE_OPTIONS.map((level) => (
                  <Button
                    key={level}
                    variant={profile.experienceLevel === level ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => { updateExperienceLevel(level); setProfile(getProfile()); }}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Horizon */}
            <div style={{ display: "grid", gap: space[2] }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
                Time Horizon
              </label>
              <div style={{ display: "flex", gap: space[2] }}>
                {HORIZON_OPTIONS.map((horizon) => (
                  <Button
                    key={horizon}
                    variant={profile.timeHorizon === horizon ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => { updateTimeHorizon(horizon); setProfile(getProfile()); }}
                  >
                    {horizon.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Max Risk Level */}
            <div style={{ display: "grid", gap: space[2] }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
                Maximum Risk Tolerance
              </label>
              <div style={{ display: "flex", gap: space[2] }}>
                {RISK_LEVELS.map((risk) => (
                  <Button
                    key={risk}
                    variant={profile.maxRiskLevel === risk ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => { updateMaxRiskLevel(risk); setProfile(getProfile()); }}
                  >
                    {risk}
                  </Button>
                ))}
              </div>
            </div>

            {/* Research Topics */}
            <div style={{ display: "grid", gap: space[2] }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
                Sectors of Interest
              </label>
              <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
                {TOPIC_OPTIONS.map((topic) => (
                  <Button
                    key={topic}
                    variant={profile.researchTopics?.includes(topic) ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleTopic(topic)}
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
