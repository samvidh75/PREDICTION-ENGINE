import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../components/intelligence/ConfidenceEngine";
import IntelligenceFeed from "../components/community/IntelligenceFeed";
import CinematicConversationInterface from "../components/community/CinematicConversationInterface";
import CommunityRoomRail, { type CommunityRoomId } from "../components/community/CommunityRoomRail";
import CommunityReputationIntelligence from "../components/community/CommunityReputationIntelligence";

function confidenceLabel(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function glowFor(state: ConfidenceState, theme: ConfidenceTheme): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
}

function SectionCard({
  title,
  subtitle,
  children,
  toneGlow,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  toneGlow: string;
}): JSX.Element {
  return (
    <div
      className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${toneGlow}` }}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{title}</div>
          {subtitle && <div className="mt-3 text-[22px] font-medium text-white/92">{subtitle}</div>}
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">calm • editorial • structured</div>
      </div>

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

function PlaceholderThread({ title, body, toneGlow }: { title: string; body: string; toneGlow: string }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
      className="w-full rounded-[28px] border border-white/10 bg-black/20 p-6"
      style={{ boxShadow: `0 0 80px ${toneGlow}` }}
    >
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Research note</div>
      <div className="mt-3 text-[18px] font-semibold leading-[1.5] text-white/92">{title}</div>
      <div className="mt-3 text-[15px] leading-[1.8] text-white/85">{body}</div>
      <div className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/45">
        Discussion indicator: structured analysis • calm framing
      </div>
    </motion.div>
  );
}

export default function CommunityHubPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme } = useConfidenceEngine();

  const [activeRoom, setActiveRoom] = useState<CommunityRoomId>("Market Behaviour");

  const toneGlow = useMemo(() => glowFor(state, theme), [state, theme]);

  const roomSubtitle = useMemo(() => {
    switch (activeRoom) {
      case "Banking Intelligence":
        return "Private banking alignment, interpreted with calm context";
      case "Technology Structure":
        return "Large-cap technology posture and disciplined momentum reading";
      case "Volatility Environment":
        return "Volatility-conditioned awareness without fear framing";
      case "Institutional Flow":
        return "Institutional tone, allocation shifts, and measured interpretation";
      case "Earnings Analysis":
        return "Earnings posture and confidence environment continuity";
      case "Market Behaviour":
      default:
        return "Market structure notes designed for long-term understanding";
    }
  }, [activeRoom]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <div className="absolute inset-0 z-0">{/* global atmosphere handled elsewhere */}</div>

      <div className="relative z-[10] px-[20px] sm:px-[72px] pt-[96px] pb-[80px]">
        <div className="max-w-[1680px] mx-auto">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
                Community Intelligence Network • {confidenceLabel(state)}
              </div>
              <div className="mt-3 text-[42px] font-semibold leading-[1.1] tracking-[-0.04em]">Collaborative market interpretation</div>
              <div className="mt-4 max-w-[820px] text-[15px] leading-[1.8] text-white/85">
                A premium, editorial intelligence environment—built for reasoning, confidence contexts, and calm discussion. No hype. No certainty claims.
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Community atmosphere</div>
              <div className="mt-3 text-[20px] font-semibold text-white/92">
                {state === "ELEVATED_RISK" ? "Defensive interpretive focus" : "Structured editorial clarity"}
              </div>
              <div className="mt-3 text-[13px] leading-[1.7] text-white/80">
                Reputation prioritises consistency and clarity. Moderation blocks certainty claims and manipulation language.
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Tone: calm • credible • non-manipulative</div>
            </div>
          </div>

          {/* Section 1: Intelligence Feed */}
          <div className="mt-10">
            <SectionCard title="Intelligence Feed" subtitle="Editorial market notes" toneGlow={toneGlow}>
              <IntelligenceFeed />
            </SectionCard>
          </div>

          {/* Core conversation ecosystem */}
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <SectionCard title="Thesis Network" subtitle="Structured market theses (no prediction framing)" toneGlow={toneGlow}>
                <div className="space-y-4">
                  <PlaceholderThread
                    title="Defensive rotation emerges even under index-level stability"
                    body="Community theses focus on behavioural context, institutional posture, and confidence environment boundaries—without guaranteeing outcomes."
                    toneGlow={toneGlow}
                  />
                  <PlaceholderThread
                    title="Liquidity conditioning shapes momentum sensitivity across sectors"
                    body="Theses connect liquidity breadth with narrative pacing and confidence states, supporting calm interpretation rather than hype."
                    toneGlow={toneGlow}
                  />
                </div>
              </SectionCard>

              <div className="mt-8">
                <SectionCard title="Cinematic Conversation Interface" subtitle="Quality-tuned discussion cards" toneGlow={toneGlow}>
                  <CinematicConversationInterface roomId={activeRoom} roomName={activeRoom} />
                </SectionCard>
              </div>
            </div>

            <div className="lg:col-span-5">
              <SectionCard title="Market Rooms" subtitle="Elite research environments" toneGlow={toneGlow}>
                <CommunityRoomRail activeRoom={activeRoom} onChange={setActiveRoom} />

                <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-5">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Current room</div>
                  <div className="mt-3 text-[18px] font-semibold text-white/92">{activeRoom}</div>
                  <div className="mt-3 text-[14px] leading-[1.8] text-white/80">{roomSubtitle}</div>
                  <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">AI conversation quality system: spam/pump/manipulation tuned down</div>
                </div>
              </SectionCard>

              <div className="mt-8">
                <SectionCard title="Insight Reputation System" subtitle="Credibility signals (not popularity)" toneGlow={toneGlow}>
                  <CommunityReputationIntelligence />
                  <div className="mt-4 text-[13px] leading-[1.8] text-white/80">
                    Trust rewards consistency, educational value, and respectful reasoning—without badges or influencer culture.
                  </div>
                </SectionCard>
              </div>

              {!prefersReducedMotion && (
                <div className="mt-8">
                  <SectionCard title="Reflection & Learning System" subtitle="Long-term market understanding" toneGlow={toneGlow}>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Learning loop</div>
                      <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                        Reflection journals and thesis evolution tracking reinforce disciplined reasoning—without shaming or grades.
                      </div>
                      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Built for calm progress • no influencer culture</div>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 text-center text-[12px] uppercase tracking-[0.18em] text-white/45">
            Institutional-grade conversational ecosystem • Educational only • No certainty claims
          </div>
        </div>
      </div>
    </div>
  );
}
