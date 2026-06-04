import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { OnboardingSeedSelection } from "../../services/onboarding/onboardingFirstRunMemory";
import { BodyText, MicroLabel, SectionTitle, CardHeading } from "../../designSystem/TypographyIntelligence";

type Props = {
  visible: boolean;

  preferredSearchPills: string[];
  seedSelection: OnboardingSeedSelection | null;

  onOpenSearch: (q: string) => void;
  onExploreSeed: (seed: OnboardingSeedSelection) => void;

  onDismiss: () => void;
};

type Stage = "search" | "explore";

function pickFallbackPills(fallbackCount: number): string[] {
  const base = ["institutional selectivity", "sector rotation", "liquidity narrowing", "volatility posture", "long-term quality", "earnings environment"];
  return base.slice(0, fallbackCount);
}

export default function BeginnerModeOverlay({
  visible,
  preferredSearchPills,
  seedSelection,
  onOpenSearch,
  onExploreSeed,
  onDismiss,
}: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("search");

  const pills = useMemo(() => {
    const safe = preferredSearchPills.filter((x) => typeof x === "string" && x.trim().length > 0);
    if (safe.length >= 2) return safe.slice(0, 4);
    return pickFallbackPills(4);
  }, [preferredSearchPills]);

  const canExplore = !!seedSelection;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="beginner_mode_overlay"
          initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 8, filter: "blur(8px)" }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] as const }}
          className="fixed inset-0 z-[80] pointer-events-auto"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

          {/* Panel */}
          <div className="absolute left-1/2 top-[14vh] -translate-x-1/2 w-[92vw] max-w-[720px]">
            <div className="rounded-[28px] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_0_90px_rgba(0,0,0,0.55)] p-5 sm:p-7">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <MicroLabel>Beginner-first guidance</MicroLabel>
                  <SectionTitle className="ss-ty-flush mt-2">
                    {stage === "search" ? "Open your calm workspace" : "Enter your guided learning step"}
                  </SectionTitle>
                  <BodyText className="mt-3">
                    {stage === "search"
                      ? "Pick a gentle lens. We’ll keep everything educational—no pressure, no noise."
                      : canExplore
                        ? "We’ll seed your environment around the selection you made during onboarding."
                        : "Your guided step isn’t ready yet. Start with a calm search instead."}
                  </BodyText>
                </div>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="h-[38px] w-[38px] rounded-full border border-white/10 bg-black/20 text-white/70 hover:text-white/95 transition ss-focus-outline"
                  aria-label="Dismiss onboarding guidance"
                >
                  ×
                </button>
              </div>

              {/* Stage content */}
              <div className="mt-6">
                {stage === "search" && (
                  <>
                      <MicroLabel>Quick search filters</MicroLabel>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {pills.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => onOpenSearch(q)}
                          className="h-[34px] rounded-full border border-white/10 bg-black/25 px-[14px] ss-ty-nav-label hover:text-white/85 transition ss-focus-outline"
                          style={{ ["--ss-ty-nav-label-color" as never]: "rgba(255,255,255,0.65)" }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[20px] border border-white/10 bg-black/25 p-4">
                      <MicroLabel>Guidance note</MicroLabel>
                      <BodyText className="mt-2">
                        Select one result—then we’ll keep your next layer calm and educational.
                      </BodyText>
                    </div>
                  </>
                )}

                {stage === "explore" && (
                  <>
                    <MicroLabel>Your guided selection</MicroLabel>

                    <div className="mt-3">
                      {seedSelection ? (
                        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                          <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                              <MicroLabel>{seedSelection.kind}</MicroLabel>
                              <div className="mt-2">
                                <CardHeading className="ss-ty-flush truncate">{seedSelection.title}</CardHeading>
                              </div>
                            </div>

                            <div className="shrink-0 h-[10px] w-[10px] rounded-full bg-white/70" aria-hidden="true" />
                          </div>

                          <BodyText className="mt-3">
                            We’ll align your environment around this selection and keep interpretation probabilistic.
                          </BodyText>
                        </div>
                      ) : (
                        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                          <BodyText>No selection found yet. Use the search lens step first.</BodyText>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setStage("search")}
                        className="h-[44px] px-[18px] rounded-[18px] border border-white/10 bg-black/20 text-white/65 hover:text-white/90 transition ss-focus-outline"
                      >
                        Back to search
                      </button>

                      <motion.button
                        type="button"
                        onClick={() => {
                          if (!seedSelection) return;
                          onExploreSeed(seedSelection);
                        }}
                        disabled={!canExplore}
                        whileHover={
                          prefersReducedMotion
                            ? undefined
                            : canExplore
                              ? { translateY: -2 }
                              : undefined
                        }
                        className={[
                          "h-[44px] px-[18px] rounded-[18px] border border-white/10 bg-black/25 text-white/90 transition ss-focus-outline",
                          !canExplore ? "opacity-50 cursor-not-allowed" : "hover:border-white/16",
                        ].join(" ")}
                        aria-disabled={!canExplore}
                      >
                        Continue with guided selection
                      </motion.button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer actions */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {stage === "search" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (seedSelection) setStage("explore");
                      }}
                      disabled={!seedSelection}
                      className={[
                        "h-[44px] px-[18px] rounded-[18px] border border-white/10 bg-black/25 text-white/70 transition ss-focus-outline",
                        seedSelection ? "hover:text-white/95 hover:border-white/16" : "opacity-50 cursor-not-allowed",
                      ].join(" ")}
                      aria-disabled={!seedSelection}
                    >
                      Next: guided seed
                    </button>

                    <MicroLabel>Calm pace • fewer overlays • context-first</MicroLabel>
                  </>
                )}

                {stage === "explore" && seedSelection && (
                    <MicroLabel>Context seeding • clear guidance</MicroLabel>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
