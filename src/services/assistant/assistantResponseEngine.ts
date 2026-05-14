import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { MarketState } from "../intelligence/marketState";
import type { SectorId } from "../portfolio/portfolioIntelligenceEngine";

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
    concentration: number; // 0..1
    volatilitySensitivity: number; // 0..1
  };
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

function detectIntent(text: string): {
  intent:
    | "volatility"
    | "liquidity"
    | "breadth"
    | "institutional"
    | "sector_rotation"
    | "earnings"
    | "portfolio_environment"
    | "behavioural_reflection"
    | "general";
} {
  const t = text.toLowerCase();

  const isPanic = /(panic|fomo|overtrade|overtrading|revenge|impulse|emotion|shaking|anxious|worried)/i.test(t);
  if (isPanic) return { intent: "behavioural_reflection" };

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
        return "Volatility conditions appear active but not dominant, so interpretation can stay context-first.";
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
  const intent = detectIntent(userText);

  const extractedSectors = sectorFromKeywords(userText);
  const nextPreferredSectors =
    extractedSectors.length > 0 ? [...new Set([...memory.preferredSectors, ...extractedSectors])] : memory.preferredSectors;

  const updatedMemory: AssistantMemory = {
    preferredSectors: nextPreferredSectors,
    experienceLevel: memory.experienceLevel,
    lastConfidenceState: context.confidenceState,
    lastNarrativeKey: context.narrativeKey,
  };

  const envLabel = confidenceLabel(context.confidenceState);

  const commonIntro =
    `Right now, the confidence environment reads as ${envLabel}. ` +
    `In this simulated learning space, we focus on structure and context—no certainty claims.`;

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

  const followups: string[] = [];
  const reply = (() => {
    switch (intent.intent) {
      case "volatility": {
        followups.push("How does volatility interact with concentration in an educational lens?");
        followups.push("What does momentum weakening change about interpretation?");
        return safeEducationalFrame(
          "What rising volatility often means (educationally)",
          `${commonIntro}\n\n${marketPointers}\n\nInterpretation lens: higher volatility usually increases how quickly narrative clarity becomes sensitive to exposure texture (concentration, liquidity posture, and sector pacing). It does not imply an outcome; it changes how fast context matters.`
        );
      }

      case "liquidity": {
        followups.push("How does liquidity breadth affect momentum sensitivity?");
        followups.push("Why does market breadth narrowing make sector themes stand out?");
        return safeEducationalFrame(
          "Liquidity & interpretation texture",
          `${commonIntro}\n\nIn this framework, liquidity changes how smoothly market signals translate into confidence environments. When liquidity conditioning is weaker, sector-level narratives can appear sharper because the environment becomes more selective.\n\nEducational focus: we watch liquidity as a pacing variable, not a direction-certainty variable.${portfolioPart}`
        );
      }

      case "breadth": {
        followups.push("What is sector rotation, in calm educational terms?");
        followups.push("How do breadth and volatility interact under this confidence environment?");
        return safeEducationalFrame(
          "Market breadth & narrative clarity",
          `${commonIntro}\n\n${marketPointers}\n\nWhen breadth narrows, fewer segments carry the weight of the narrative. That often makes sector themes more visible and can make behavioural interpretation feel more selective (even if the overall index story looks steady).${portfolioPart}`
        );
      }

      case "institutional": {
        followups.push("How do institutional signals stay steady even when volatility changes?");
        followups.push("What does “selective institutional posture” mean without predictions?");
        return safeEducationalFrame(
          "Institutional activity (context-first)",
          `${commonIntro}\n\nIn this framework, institutional alignment is treated as a stability cue for confidence environments—not as a trade signal. When institutional participation looks steady, it can support continuity in narratives even if volatility fluctuates.\n\nIf confidence is elevated risk, the same institutional tone may still be present, but the environment becomes more sensitive to pacing and concentration boundaries.${portfolioPart}`
        );
      }

      case "sector_rotation": {
        followups.push("Why might defensive sector rotation appear without panic?");
        followups.push("How does sector rotation connect to behavioural discipline?");
        return safeEducationalFrame(
          "What sector rotation means (educational)",
          `${commonIntro}\n\nSector rotation describes how confidence attention migrates across themes (banking, technology, energy, etc.) as market structure adapts. Under narrower breadth or higher volatility, rotation often becomes more noticeable because fewer segments dominate attention.\n\nPractical learning point: we interpret rotation as a context change for decision pacing—without predicting outcomes.${portfolioPart}`
        );
      }

      case "earnings": {
        followups.push("How do earnings narratives fit into confidence environments?");
        followups.push("Why do we treat earnings as interpretation context, not certainty?");
        return safeEducationalFrame(
          "Earnings interpretation without prediction",
          `${commonIntro}\n\nEarnings is treated here as narrative input, not a guarantee. Confidence environments help us place earnings observations inside a broader context (liquidity, volatility sensitivity, and breadth).\n\nIf the environment is elevated risk, earnings impact can become more timing-sensitive—so interpretation stays guarded rather than certain.${portfolioPart}`
        );
      }

      case "portfolio_environment": {
        followups.push("How can concentration tightening change behavioural pacing?");
        followups.push("What does elevated volatility exposure do to interpretation boundaries?");
        return safeEducationalFrame(
          "Portfolio environment (structure-first)",
          `${commonIntro}\n\nPortfolio intelligence focuses on environment boundaries: concentration texture, volatility sensitivity, and defensive alignment signals.${portfolioPart}\n\nEducational framing: these elements help you understand how interpretation changes, not what you must do next.`
        );
      }

      case "behavioural_reflection": {
        followups.push("How can I slow down pacing during heightened sensitivity?");
        followups.push("What are calm behavioural cues to watch in the timeline?");
        return safeEducationalFrame(
          "Behavioural reflection: keeping pace calm",
          `Thank you for the context. When markets feel intense, it’s common for decision cycles to speed up. In this educational framework, we translate that into structure:\n\n${marketPointers}\n\nCalm learning cue: focus on concentration boundaries and liquidity conditioning first, then re-evaluate exposure modules incrementally—so interpretation stays measured rather than reactive.${portfolioPart}\n\nIf you want, tell me which sector you’re most focused on right now, and I’ll map the learning lens to that focus.`
        );
      }

      case "general":
      default: {
        followups.push("What does sector rotation look like in this confidence atmosphere?");
        followups.push("How should I interpret volatility changes without certainty claims?");
        return safeEducationalFrame(
          "Market interpretation, calm and contextual",
          `${commonIntro}\n\n${marketPointers}\n\nIf you share what you’re noticing—volatility, breadth, institutional tone, or sector rotation—I’ll translate it into a structured, educational interpretation layer.${portfolioPart}`
        );
      }
    }
  })();

  const suggestedFollowups = followups.slice(0, 3);
  const environmentNotification = buildEnvironmentNotification(context, memory);

  return {
    reply,
    updatedMemory,
    suggestedFollowups,
    environmentNotification,
  };
}
