import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { analyzeCommunityMessage, buildEducationalReframe } from "../../services/community/communityQualityEngine";
import useBeginnerIntelligenceCalibration from "../../hooks/useBeginnerIntelligenceCalibration";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import CommunityMessageCard from "./CommunityMessageCard";
import { updateCommunityReputationOnMessage } from "../../services/community/communityReputationStore";

export type CommunityRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type CommunityMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  analysisCategory: string;
  riskLevel: CommunityRiskLevel;
  displayText: string;

  /**
   * Only populated for HIGH risk messages (system overlay).
   * Helps users understand why the system adjusted the phrasing.
   */
  moderationRationale?: string;
  moderationFlags?: string[];
};

export type CinematicConversationInterfaceProps = {
  roomId: string;
  roomName: string;
  initialMessages?: CommunityMessage[];
};

function normalizeRiskLevel(value: unknown): CommunityRiskLevel {
  const v = String(value ?? "").toUpperCase();
  if (v === "HIGH") return "HIGH";
  if (v === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function createId(): string {
  // Prefer crypto.randomUUID when available.
  const c: unknown = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof (c as { randomUUID?: () => string }).randomUUID === "function") {
    return (c as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function glowForState(
  state: ConfidenceState,
  theme: { cyanGlow: string; magentaGlow: string; deepBlueGlow: string; warningGlow: string },
): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
    case "STABLE_CONVICTION":
    case "NEUTRAL_ENVIRONMENT":
    default:
      return theme.cyanGlow ?? theme.deepBlueGlow;
  }
}

function formatCooldownSeconds(ms: number): string {
  return `${Math.max(1, Math.ceil(ms / 1000))}s`;
}

export default function CinematicConversationInterface({
  roomId, // intentionally unused in current deterministic local UI
  roomName,
  initialMessages,
}: CinematicConversationInterfaceProps): JSX.Element {
  const [messages, setMessages] = useState<CommunityMessage[]>(initialMessages ?? []);
  const [draft, setDraft] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { state, theme } = useConfidenceEngine();
  const { experienceLevel } = useBeginnerIntelligenceCalibration();
  const beginner = experienceLevel === "beginner";

  // Calm social pacing (prevents “rapid-fire” posts & spammy interaction cadence).
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number>(0);
  const [cooldownLeftMs, setCooldownLeftMs] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tick = () => {
      const left = Math.max(0, cooldownUntilMs - Date.now());
      setCooldownLeftMs(left);
    };

    if (cooldownUntilMs <= Date.now()) {
      setCooldownLeftMs(0);
      return;
    }

    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [cooldownUntilMs]);

  const isInCooldown = cooldownLeftMs > 0;

  const glowCss = useMemo(() => {
    const g = glowForState(state, theme);
    return `0 0 64px ${g}`;
  }, [state, theme]);

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text || isSubmitting) return;
    if (Date.now() < cooldownUntilMs) return;

    setIsSubmitting(true);

    // Deterministic, local UI gating.
    // (No async deps: rep + message rendering remain synchronous.)
    try {
      const analysis = analyzeCommunityMessage(text);

      // Convert heuristics bucket to UI risk label.
      const riskLevel = normalizeRiskLevel(analysis.riskLevel);

      // Quality gating:
      // - Treat ABUSE/SPAM as HIGH so we never surface harmful/polluting phrasing.
      // - Also keep existing HYPE/MANIPULATION -> HIGH overlay policy.
      const treatAsHigh =
        riskLevel === "HIGH" ||
        analysis.category === "HYPE" ||
        analysis.category === "MANIPULATION" ||
        analysis.category === "ABUSE" ||
        analysis.category === "SPAM";

      const effectiveRiskLevel: CommunityRiskLevel = treatAsHigh ? "HIGH" : riskLevel;

      // Reputation update (trust architecture):
      // analysis.score is a risk likelihood [0..1] => store converts to quality.
      updateCommunityReputationOnMessage({
        analysisScore: analysis.score,
        category: analysis.category,
      });

      const base: Omit<CommunityMessage, "displayText"> = {
        id: createId(),
        author: "You",
        text,
        createdAt: new Date().toISOString(),
        analysisCategory: analysis.category,
        riskLevel: effectiveRiskLevel,
      };

      if (treatAsHigh) {
        const reframe = buildEducationalReframe(text, analysis, beginner ? "beginner" : "intermediate");
        setMessages((prev) => [
          ...prev,
          {
            ...base,
            displayText: reframe.reframed,
            moderationRationale: reframe.rationale,
            moderationFlags: analysis.flags,
          },
        ]);
      } else {
        // For LOW/MEDIUM we keep the user’s phrasing visible to reduce disruption.
        // The card still signals quality via risk badge.
        setMessages((prev) => [
          ...prev,
          {
            ...base,
            displayText: text,
          },
        ]);
      }

      setDraft("");

      const cooldownMs = beginner ? 1200 : 900;
      setCooldownUntilMs(Date.now() + cooldownMs);
    } finally {
      // Keep it synchronous/deterministic (no async deps).
      setIsSubmitting(false);
    }
  };

  const buttonLabel = (() => {
    if (isSubmitting) return "Analyzing…";
    if (isInCooldown) return `Calm pacing… ${formatCooldownSeconds(cooldownLeftMs)}`;
    return "Send";
  })();

  return (
    <div className="rounded-[28px] border border-white/10 bg-black/20 shadow-[0_0_40px_rgba(0,0,0,0.35)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-white/70">Room</div>
          <div className="mt-1 text-[18px] font-semibold text-white/92">{roomName}</div>
          <div className="mt-1 text-xs text-white/45">
            {beginner ? "Share your thoughts—keep it calm, evidence-first." : "Share, and let the system tune for clarity and safety."}
          </div>
        </div>

        <motion.div
          className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2"
          style={{ boxShadow: glowCss }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className="text-xs text-white/50">Atmosphere</span>
          <span className="text-xs font-medium text-white/80">{state.replaceAll("_", " ").toLowerCase()}</span>
        </motion.div>
      </div>

      <div className="mt-5">
        <div className="max-h-[380px] overflow-auto pr-1 space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <CommunityMessageCard key={m.id} message={m} glowCss={glowCss} isBeginner={beginner} />
            ))}

            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-[28px] border border-white/10 bg-black/25 p-6"
              >
                <div className="text-sm font-semibold text-white/90">{beginner ? "Start the conversation" : "Begin the discussion"}</div>
                <div className="mt-2 text-sm text-white/55 leading-relaxed">
                  {beginner
                    ? "Write something respectful. If a phrase looks risky, the system will help with a safer educational rewrite."
                    : "Write freely. If the system flags high-risk language, you’ll see a muted educational overlay and a safer reframe."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5">
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <label className="block text-xs text-white/45 mb-2">{beginner ? "Your message" : "Compose message"}</label>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              beginner
                ? "Example: I disagree, and here’s the evidence I’m using..."
                : "Example: I see it differently—here are the key uncertainties..."
            }
            rows={3}
            className="w-full resize-none rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-white/40">
              {isInCooldown
                ? "Calm pacing lock active: one thoughtful post at a time."
                : beginner
                  ? "Tip: evidence-first, respectful tone."
                  : "Keep it constructive: clarify evidence and uncertainty."}
            </div>

            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !draft.trim() || isInCooldown}
              className={[
                "rounded-full border px-5 py-2 text-sm font-medium transition",
                isSubmitting || !draft.trim() || isInCooldown
                  ? "border-white/10 bg-black/15 text-white/40 cursor-not-allowed"
                  : "border-white/15 bg-black/25 text-white/85 hover:bg-black/35 hover:border-white/25",
              ].join(" ")}
              whileHover={{ scale: !isSubmitting && !isInCooldown && draft.trim() ? 1.01 : 1 }}
              whileTap={{ scale: 0.99 }}
            >
              {buttonLabel}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
