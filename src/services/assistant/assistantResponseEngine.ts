import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { MarketState } from "../intelligence/marketState";
import type { SectorId } from "../portfolio/portfolioIntelligenceEngine";
import type { NeuralMarketSynthesis } from "../synthesis/neuralMarketSynthesisTypes";
import { applyComplianceCopyFilter } from "../../lib/compliance/complianceCopyFilter";

export type AssistantMemory = {
  preferredSectors: SectorId[];
  experienceLevel: "beginner" | "intermediate";
  lastConfidenceState?: ConfidenceState;
  lastNarrativeKey?: number;
};

export type AssistantContext = {
  confidenceState: ConfidenceState;
  marketState: MarketState;
  theme: ConfidenceTheme;
  narrativeKey: number;
  portfolioSummary?: {
    environmentLabel: string;
    concentration: number; // 0..1 (simulated, presentational only)
    volatilitySensitivity: number; // 0..1
  };

  /**
   * Optional synthesis layer.
   * Used for Healthometer + macro/company context while staying SEBI-safe (educational only).
   */
  synthesis?: NeuralMarketSynthesis;
};

export type AssistantResponse = {
  reply: string;
  updatedMemory: AssistantMemory;
  suggestedFollowups: string[];
  environmentNotification?: {
    title: string;
    body: string;
  };
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatPct(n01: number): string {
  return `${Math.round(clamp(n01, 0, 1) * 100)}%`;
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

function sectorFromKeywords(text: string): SectorId[] {
  const t = text.toLowerCase();
  const hits: SectorId[] = [];

  const add = (id: SectorId) => {
    if (!hits.includes(id)) hits.push(id);
  };

  if (/(bank|banking|bse|nifty bank)/i.test(t)) add("Banking");
  if (/(it|software|tech|infy|wipro|tcs)/i.test(t)) add("IT");
  if (/(energy|oil|refinery|reliance)/i.test(t)) add("Energy");
  if (/(fmcg|hindi|consumer|hindustan|hindu)/i.test(t)) add("FMCG");
  if (/(pharma|drug|sun pharma|sunpharma)/i.test(t)) add("Pharma");
  if (/(defence|drdo)/i.test(t)) add("Defence");
  if (/(auto|tata motors|tvm|automobile)/i.test(t)) add("Auto");
  if (/(infra|infrastructure|lti)/i.test(t)) add("Infrastructure");

  return hits;
}

type AssistantIntent =
  | "volatility"
  | "liquidity"
  | "breadth"
  | "institutional"
  | "sector_rotation"
  | "earnings"
  | "portfolio_environment"
  | "healthometer_interpretation"
  | "macro_explanation"
  | "company_storytelling"
  | "behavioural_reflection"
  | "general";

function detectIntent(text: string): { intent: AssistantIntent } {
  const t = text.toLowerCase();

  const isPanic = /(panic|fomo|overtrade|overtrading|revenge|impulse|emotion|shaking|anxious|worried)/i.test(t);
  if (isPanic) return { intent: "behavioural_reflection" };

  // Healthometer signals
  if (/(healthometer|structurally healthy|structurally fragile|stable expansion|confidence improving|momentum sensitive|volatility exposed)/i.test(t)) {
    return { intent: "healthometer_interpretation" };
  }
  // Macro signals
  if (
    /(inflation|interest rate|rates|bond yield|yield|oil|crude|usd|dollar|rbi|fed|geopolitical|war|geopolitics|currency|fx|exchange rate)/i.test(t)
  ) {
    return { intent: "macro_explanation" };
  }
  // Company storytelling signals
  if (
    /(why did|how does|how did|make money|business model|management|leadership|revenue|margin|margin expansion|strategy|company story|tata|infosys|reliance|drdo|sun pharma|hindustan|hero)/i.test(
      t,
    )
  ) {
    return { intent: "company_storytelling" };
  }

  if (/(volatility|vix|v i x|wider swings|sudden move)/i.test(t)) return { intent: "volatility" };
  if (/(liquidity|market depth|bid-ask|order flow)/i.test(t)) return { intent: "liquidity" };
  if (/(breadth|nifty breadth|participation|advance|decline|narrow|wide)/i.test(t)) return { intent: "breadth" };
  if (/(institution|fii|dii|fiidii|institutional)/i.test(t)) return { intent: "institutional" };
  if (/(sector rotation|rotation|moving between sectors|cyclical|defensive|growth)/i.test(t)) return { intent: "sector_rotation" };
  if (/(earnings|results|profit|guidance|quarter)/i.test(t)) return { intent: "earnings" };
  if (/(portfolio|holdings|allocation|concentration|exposure|risk sensitivity)/i.test(t)) return { intent: "portfolio_environment" };

  return { intent: "general" };
}

function safeEducationalFrame(title: string, body: string): string {
  return `${title}\n\n${body}\n\nSimulated educational interpretation • no certainty • no trade execution.`;
}

function beginnerFormat(level: "beginner" | "intermediate") {
  const beginner = level === "beginner";
  return {
    opener: beginner ? "Beginner-friendly framing:" : "Calm, structured interpretation:",
    toneTip: beginner
      ? "If anything feels dense, we’ll translate it into context-first language."
      : "We’ll keep it bounded: what changes is interpretation pace—not outcomes.",
  };
}

function buildEnvironmentNotification(ctx: AssistantContext, memory: AssistantMemory): AssistantResponse["environmentNotification"] {
  const stateChanged = memory.lastConfidenceState && memory.lastConfidenceState !== ctx.confidenceState;
  const first = memory.lastConfidenceState == null;

  if (!stateChanged && !first) return undefined;

  const title = first
    ? "Market environment is now contextualised"
    : `Environment shift detected: ${confidenceLabel(memory.lastConfidenceState!)} → ${confidenceLabel(ctx.confidenceState)}`;

  const volatilityNote = (() => {
    switch (ctx.marketState) {
      case "Elevated Volatility":
      case "Momentum Fragmentation":
        return "Volatility conditions suggest increased sensitivity, so interpretation becomes more responsive to exposure texture.";
      case "Broad Weakness":
        return "Volatility conditions appear active but not dominant, so interpretation can stay measured and context-first.";
      default:
        return "Volatility conditions appear comparatively restrained, so interpretation can remain continuity-first.";
    }
  })();

  const breadthNote = (() => {
    switch (ctx.marketState) {
      case "Liquidity Compression":
      case "Broad Weakness":
      case "Momentum Fragmentation":
        return "Participation breadth looks narrower, which often makes sector-level themes more noticeable.";
      default:
        return "Participation breadth looks supportive, which can smooth the confidence narrative.";
    }
  })();

  return {
    title,
    body: `${volatilityNote} ${breadthNote}`,
  };
}

export function generateAssistantResponse(args: {
  userText: string;
  memory: AssistantMemory;
  context: AssistantContext;
}): AssistantResponse {
  const { userText, memory, context } = args;

  const intent = detectIntent(userText).intent;

  const extractedSectors = sectorFromKeywords(userText);
  const nextPreferredSectors =
    extractedSectors.length > 0 ? [...new Set([...memory.preferredSectors, ...extractedSectors])] : memory.preferredSectors;

  const updatedMemory: AssistantMemory = {
    preferredSectors: nextPreferredSectors,
    experienceLevel: memory.experienceLevel,
    lastConfidenceState: context.confidenceState,
    lastNarrativeKey: context.narrativeKey,
  };

  const synth = context.synthesis;
  const health = synth?.healthometer;
  const synthesisHeadline = synth?.narrative.editorialHeadline;
  const synthesisCinematicBody = synth?.narrative.cinematicBody;
  const synthesisConditionsNote = synth?.narrative.conditionsNote;

  const envLabel = confidenceLabel(context.confidenceState);

  const { opener, toneTip } = beginnerFormat(memory.experienceLevel);

  const commonIntro =
    `${opener} Right now, the confidence environment reads as ${envLabel}. ` +
    `In this simulated learning space, we focus on structure and context—no certainty claims.` +
    ` ${toneTip}`;

  const marketPointers = (() => {
    const volatilityLine = (() => {
      switch (context.marketState) {
        case "Elevated Volatility":
        case "Momentum Fragmentation":
          return "Volatility proxy suggests increased sensitivity; timing and exposure texture matter more.";
        case "Broad Weakness":
          return "Volatility proxy suggests active conditions; interpretation can stay measured and contextual.";
        default:
          return "Volatility proxy suggests comparatively restrained sensitivity; continuity-first framing works well.";
      }
    })();

    const breadthLine = (() => {
      switch (context.marketState) {
        case "Liquidity Compression":
        case "Broad Weakness":
        case "Momentum Fragmentation":
          return "Participation breadth appears narrower in this environment, making sector narratives more noticeable.";
        default:
          return "Participation breadth appears supportive, helping keep confidence narrative continuity stable.";
      }
    })();

    return `${volatilityLine} ${breadthLine}`;
  })();

  const portfolioPart = (() => {
    if (!context.portfolioSummary) return "";

    const { environmentLabel, concentration, volatilitySensitivity } = context.portfolioSummary;

    const concLine =
      concentration >= 0.36
        ? `Your simulated exposure concentration looks elevated (around ${formatPct(concentration)}), so environment boundaries matter more.`
        : `Your simulated exposure concentration looks moderate (around ${formatPct(concentration)}), which can support steadier interpretation.`;

    const volLine =
      volatilitySensitivity >= 0.7
        ? `Volatility sensitivity appears meaningful (around ${formatPct(volatilitySensitivity)}), so timing-based sensitivity is more noticeable.`
        : `Volatility sensitivity appears contained (around ${formatPct(volatilitySensitivity)}), so structure-first interpretation can remain effective.`;

    return `\n\nPortfolio context: ${environmentLabel}. ${concLine} ${volLine}`;
  })();

  const reply = (() => {
    switch (intent) {
      case "healthometer_interpretation": {
        const state = health?.state ?? "Structurally Healthy";
        const rationale = health?.rationale ?? "Healthometer is treating structural cues as supportive.";
        const marginText = health?.confidenceMarginText ?? "Confidence margin is bounded and educational.";

        return safeEducationalFrame(
          "Healthometer interpretation (no recommendations)",
          `${commonIntro}\n\nHealthometer reading: ${state}\n\n${rationale}\n\nConfidence margin note: ${marginText}` +
            `\n\nLearning point: healthometer is a *tone* and *stability lens*, not a buy/sell signal. It helps you interpret whether narratives should stay continuity-first or become more sensitivity-aware.${portfolioPart}`,
        );
      }

      case "macro_explanation": {
        const macroHeadline = synth?.macroGeopolitical.headline ?? "Macro context is shaping the confidence atmosphere";
        const macroBody = synth?.macroGeopolitical.body ?? "Macro inputs are treated here as educational context for how sensitivity can change.";

        return safeEducationalFrame(
          "Macro explanation (calm and educational)",
          `${commonIntro}\n\nMacro headline: ${macroHeadline}\n\n${macroBody}` +
            `\n\nInterpretation lens: macro often changes the *pacing* of how narratives react—not the certainty of outcomes.` +
            ` ${portfolioPart}`,
        );
      }

      case "company_storytelling": {
        const headline = synthesisHeadline ?? "Company evolution is being framed inside the current environment";
        const cinematic = synthesisCinematicBody ?? "We connect business evolution to structural cues and confidence boundaries.";
        const conditions = synthesisConditionsNote ?? "We keep this bounded: no certainty claims, no execution.";

        return safeEducationalFrame(
          "Company storytelling lens (documentary-style, no certainty)",
          `${commonIntro}\n\n${headline}\n\n${cinematic}\n\nConditions note: ${conditions}` +
            `\n\nIf you tell me the company you’re studying (and what you’re curious about: margins, strategy, governance, leadership, or sector placement), I’ll map the learning lens to that exact angle—without trade advice.${portfolioPart}`,
        );
      }

      case "volatility": {
        return safeEducationalFrame(
          "What rising volatility often means (educationally)",
          `${commonIntro}\n\n${marketPointers}\n\nInterpretation lens: higher volatility usually increases how quickly narrative clarity becomes sensitive to exposure texture (concentration, liquidity posture, and sector pacing). It does not imply an outcome; it changes how fast context matters.${portfolioPart}`,
        );
      }

      case "liquidity": {
        return safeEducationalFrame(
          "Liquidity & interpretation texture",
          `${commonIntro}\n\nIn this framework, liquidity changes how smoothly market signals translate into confidence environments. When liquidity conditioning is weaker, sector-level narratives can appear sharper because the environment becomes more selective.\n\nEducational focus: we watch liquidity as a pacing variable, not a direction-certainty variable.${portfolioPart}`,
        );
      }

      case "breadth": {
        return safeEducationalFrame(
          "Market breadth & narrative clarity",
          `${commonIntro}\n\n${marketPointers}\n\nWhen breadth narrows, fewer segments carry the weight of the narrative. That often makes sector themes more visible and can make behavioural interpretation feel more selective (even if the overall index story looks steady).${portfolioPart}`,
        );
      }

      case "institutional": {
        return safeEducationalFrame(
          "Institutional activity (context-first)",
          `${commonIntro}\n\nIn this framework, institutional alignment is treated as a stability cue for confidence environments—not as a trade signal. When institutional participation looks steady, it can support continuity in narratives even if volatility fluctuates.\n\nIf confidence is elevated risk, the same institutional tone may still be present, but the environment becomes more sensitive to pacing and concentration boundaries.${portfolioPart}`,
        );
      }

      case "sector_rotation": {
        return safeEducationalFrame(
          "What sector rotation means (educational)",
          `${commonIntro}\n\nSector rotation describes how confidence attention migrates across themes (banking, technology, energy, etc.) as market structure adapts. Under narrower breadth or higher volatility, rotation often becomes more noticeable because fewer segments dominate attention.\n\nPractical learning point: we interpret rotation as a context change for decision pacing—without predicting outcomes.${portfolioPart}`,
        );
      }

      case "earnings": {
        return safeEducationalFrame(
          "Earnings interpretation without prediction",
          `${commonIntro}\n\nEarnings is treated here as narrative input, not a guarantee. Confidence environments help us place earnings observations inside a broader context (liquidity, volatility sensitivity, and breadth).\n\nIf the environment is elevated risk, earnings impact can become more timing-sensitive—so interpretation stays guarded rather than certain.${portfolioPart}`,
        );
      }

      case "portfolio_environment": {
        return safeEducationalFrame(
          "Portfolio environment (structure-first)",
          `${commonIntro}\n\nPortfolio intelligence focuses on environment boundaries: concentration texture, volatility sensitivity, and defensive alignment signals.${portfolioPart}\n\nEducational framing: these elements help you understand how interpretation changes, not what you must do next.`,
        );
      }

      case "behavioural_reflection": {
        return safeEducationalFrame(
          "Behavioural reflection: keeping pace calm",
          `Thank you for the context. When markets feel intense, it’s common for decision cycles to speed up. In this educational framework, we translate that into structure:\n\n${marketPointers}\n\nCalm learning cue: focus on concentration boundaries and liquidity conditioning first, then re-evaluate exposure modules incrementally—so interpretation stays measured rather than reactive.${portfolioPart}\n\nIf you want, share the specific uncertainty you’re holding (volatility, liquidity, breadth, or sector rotation), and we’ll slow it down into an educational lens.`,
        );
      }

      case "general":
      default: {
        return safeEducationalFrame(
          "Market interpretation, calm and contextual",
          `${commonIntro}\n\n${marketPointers}\n\nIf you share what you’re noticing—volatility, breadth, institutional tone, macro context, or healthometer cues—I’ll translate it into a structured, educational interpretation layer.${portfolioPart}`,
        );
      }
    }
  })();

  const suggestedFollowups = (() => {
    const baseCommon: string[] = [
      "What does the current confidence atmosphere change about my interpretation speed?",
      "How can I keep my framing evidence-first and uncertainty-aware?",
    ];

    const fromIntent: Record<AssistantIntent, string[]> = {
      volatility: ["How does volatility interact with concentration in an educational lens?", "What does momentum weakening change about interpretation?"],
      liquidity: ["How does liquidity breadth affect momentum sensitivity?", "Why does market breadth narrowing make sector themes stand out?"],
      breadth: ["What is sector rotation, in calm educational terms?", "How do breadth and volatility interact under this confidence environment?"],
      institutional: ["How do institutional signals stay steady even when volatility changes?", "What does “selective institutional posture” mean without predictions?"],
      sector_rotation: ["Why might defensive sector rotation appear without panic?", "How does sector rotation connect to behavioural discipline?"],
      earnings: ["How do earnings narratives fit into confidence environments?", "Why do we treat earnings as interpretation context, not certainty?"],
      portfolio_environment: ["How can concentration tightening change behavioural pacing?", "What does elevated volatility exposure do to interpretation boundaries?"],
      healthometer_interpretation: ["How do structurally healthy vs fragile readings change my tone of interpretation?", "What does the confidence margin imply for learning pace (educationally)?"],
      macro_explanation: ["How do interest rates typically change sector sensitivity (educationally)?", "What macro cues should I look for without fear-based framing?"],
      company_storytelling: ["How do business evolution and strategy fit inside the current confidence environment?", "What evidence would make a company story more structurally grounded?"],
      behavioural_reflection: ["How can I slow down pacing during heightened sensitivity?", "What calm behavioural cues can I use in the timeline?"],
      general: ["What does sector rotation look like in this confidence atmosphere?", "How should I interpret volatility changes without certainty claims?"],
    };

    const specific = fromIntent[intent] ?? fromIntent.general;
    return [...specific, ...baseCommon].slice(0, 3);
  })();

  const environmentNotification = buildEnvironmentNotification(context, memory);

  const compliantReply = applyComplianceCopyFilter(reply, "educational");
  const compliantFollowups = suggestedFollowups.map((q) => applyComplianceCopyFilter(q, "educational"));

  const compliantEnvironmentNotification = environmentNotification
    ? {
        title: applyComplianceCopyFilter(environmentNotification.title, "educational"),
        body: applyComplianceCopyFilter(environmentNotification.body, "educational"),
      }
    : undefined;

  return {
    reply: compliantReply,
    updatedMemory,
    suggestedFollowups: compliantFollowups,
    environmentNotification: compliantEnvironmentNotification,
  };
}
