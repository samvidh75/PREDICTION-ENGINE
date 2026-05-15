import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import { useMotionController } from "../components/motion/MotionController";
import AssistantContextPanel from "../components/assistant/AssistantContextPanel";
import { generateAssistantResponse, type AssistantMemory } from "../services/assistant/assistantResponseEngine";
import type { AssistantResponse } from "../services/assistant/assistantResponseEngine";
import useBeginnerIntelligenceCalibration from "../hooks/useBeginnerIntelligenceCalibration";

type ChatMessage = {
  id: string;
  at: number;
  role: "user" | "assistant";
  text: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

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

function buildPortfolioSummaryFromEnvironment(confidenceState: ConfidenceState): AssistantResponse["updatedMemory"] | undefined {
  // NOTE: This is intentionally not a prediction. It’s a presentational “portfolio lens” approximation
  // to support educational framing in the assistant responses.
  return undefined;
}

function environmentLabelFromConfidence(confidenceState: ConfidenceState): string {
  switch (confidenceState) {
    case "ELEVATED_RISK":
      return "Elevated volatility-conditioned sensitivity";
    case "MOMENTUM_WEAKENING":
      return "Momentum-sensitive learning boundary";
    case "CONFIDENCE_RISING":
      return "Constructive, structure-supported environment";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced observational environment";
    case "STABLE_CONVICTION":
    default:
      return "Structurally balanced learning environment";
  }
}

export default function AssistantPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMotionController();
  const { state: confidenceState, theme, marketState, narrativeKey } = useConfidenceEngine();

  const { experienceLevel } = useBeginnerIntelligenceCalibration();

  const [memory, setMemory] = useState<AssistantMemory>({
    preferredSectors: [],
    experienceLevel,
  });

  useEffect(() => {
    setMemory((prev) => ({ ...prev, experienceLevel }));
  }, [experienceLevel]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: `a0_${Date.now()}`,
      at: Date.now(),
      role: "assistant",
      text:
        "Welcome to StockStory India’s educational intelligence interface.\n\nAsk about volatility, liquidity, market breadth, sector rotation, institutional posture, or portfolio environment—this space avoids certainty claims and avoids trade execution.",
    },
  ]);

  const [input, setInput] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);

  const canSend = input.trim().length > 0 && !isThinking;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const getCurrentInputValue = (): string => {
    return (inputRef.current?.value ?? input).toString();
  };

  const context = useMemo(() => {
    // confidenceState + marketState + theme come from ConfidenceEngine
    // marketState here is a string union (e.g. "Elevated Volatility"), by design.
    const portfolioSummary = {
      environmentLabel: environmentLabelFromConfidence(confidenceState),
      concentration: confidenceState === "ELEVATED_RISK" ? 0.42 : confidenceState === "CONFIDENCE_RISING" ? 0.28 : 0.32,
      volatilitySensitivity: confidenceState === "ELEVATED_RISK" ? 0.78 : confidenceState === "MOMENTUM_WEAKENING" ? 0.66 : 0.52,
    };

    return {
      confidenceState,
      marketState,
      theme,
      narrativeKey,
      portfolioSummary,
    };
  }, [confidenceState, marketState, theme, narrativeKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "end" });
  }, [messages, prefersReducedMotion]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      at: Date.now(),
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // Simulated calm “intelligence pulse” delay (no typing dots).
    window.setTimeout(() => {
      const memoryForEngine: AssistantMemory = { ...memory, experienceLevel };

      const resp: AssistantResponse = generateAssistantResponse({
        userText: trimmed,
        memory: memoryForEngine,
        context,
      });

      setMemory(resp.updatedMemory);

      const maybeEnv = resp.environmentNotification
        ? ([
            {
              id: `n_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              at: Date.now(),
              role: "assistant" as const,
              text: `${resp.environmentNotification.title}\n\n${resp.environmentNotification.body}`,
            },
          ] as ChatMessage[])
        : [];

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: Date.now(),
        role: "assistant",
        text: resp.reply,
      };

      setMessages((prev) => [...prev, ...maybeEnv, assistantMsg]);
      setIsThinking(false);
    }, 520);
  };

  const suggested = useMemo(() => {
    const base: string[] = [
      "What does rising volatility mean right now?",
      "Why are banking conditions remaining relatively calm?",
      "How does liquidity behave when market breadth narrows?",
    ];
    return base;
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />
      {!isMobile && <SentimentFlow />}

      <div className="relative z-[10] px-[20px] sm:px-[72px] pt-[96px] pb-[80px]">
        <div className="mx-auto max-w-[1160px]">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
                AI Market Assistant • educational intelligence only
              </div>
              <div className="mt-3 text-[42px] font-semibold leading-[1.1] tracking-[-0.04em]">
                Conversational market interpretation
              </div>
              <div className="mt-4 max-w-[740px] text-[15px] leading-[1.9] text-white/85">
                Calm, structured guidance to help you understand market structure, confidence environments, and portfolio context—
                without trade execution or certainty claims.
              </div>

              <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7">
                  <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Conversation stream</div>
                        <div className="mt-2 text-[18px] font-semibold text-white/92">
                          {confidenceLabel(confidenceState)}
                        </div>
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        {prefersReducedMotion ? "Reduced motion" : "Calm intelligence rendering"}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <AnimatePresence initial={false}>
                        {messages.map((m) => (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
                            className={m.role === "user" ? "bg-white/[0.03] border border-white/10 rounded-[24px] p-[24px]" : "bg-black/[0.24] border border-white/10 rounded-[24px] p-[24px]"}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                                {m.role === "user" ? "User" : "Assistant"}
                              </div>
                            </div>
                            <div className="mt-3 text-[14px] leading-[1.9] text-white/85" style={{ maxWidth: "70ch", whiteSpace: "pre-wrap" }}>
                              {m.text}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {isThinking && (
                        <div className="rounded-[24px] border border-white/10 bg-black/[0.22] p-[24px]">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Calm intelligence pulse</div>
                          <div className="mt-3 flex items-center gap-3">
                            <motion.div
                              className="h-[10px] w-[10px] rounded-full"
                              style={{ background: theme.cyanGlow, boxShadow: `0 0 20px ${theme.cyanGlow}` }}
                              animate={prefersReducedMotion ? undefined : { scale: [1, 1.35, 1] }}
                              transition={prefersReducedMotion ? undefined : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <div className="text-[13px] leading-[1.7] text-white/70">
                              Synchronising context and educational framing…
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={scrollRef} />
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-wrap gap-2">
                        {suggested.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => submit(s)}
                            className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submit(getCurrentInputValue());
                        }}
                      >
                        <div className="flex gap-3 items-stretch">
                          <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask calmly: volatility, liquidity, breadth, sector rotation, institutional posture…"
                            className="flex-1 h-[64px] rounded-[22px] bg-white/[0.03] border border-white/[0.05] px-5 text-[14px] text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                          />
                          <motion.button
                            type="button"
                            onClick={() => submit(getCurrentInputValue())}
                            whileHover={!prefersReducedMotion && canSend ? { translateY: -2 } : undefined}
                            className="h-[64px] px-[26px] rounded-[22px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
                          >
                            Send
                          </motion.button>
                        </div>
                      </form>

                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Educational interpretation • no certainty claims • no trade execution
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <AssistantContextPanel
                    preferredSectors={memory.preferredSectors}
                    portfolioEnvironmentLabel={context.portfolioSummary?.environmentLabel}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[12px] uppercase tracking-[0.18em] text-white/45">
          This assistant provides educational and analytical context only • no investment advice
        </div>
      </div>
    </div>
  );
}
