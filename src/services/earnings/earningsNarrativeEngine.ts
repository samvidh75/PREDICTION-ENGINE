import type { CorporateStoryInputs, EarningsNarrativeEngineOutput } from "./earningsTypes";
import type { FinancialSnapshot } from "./earningsTypes";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function safePct(n: number | undefined): number | undefined {
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

function deltaLine(label: string, deltaPct: number | undefined, fallback: string): string {
  if (typeof deltaPct !== "number" || !Number.isFinite(deltaPct)) return fallback;

  const abs = Math.abs(deltaPct);
  const dir = deltaPct >= 0 ? "increase" : "moderation";
  const signWord = deltaPct >= 0 ? "improved" : "eased";

  return `${label} shows a ${dir} (about ${abs.toFixed(1)}%) with a ${signWord} tone relative to the prior baseline.`;
}

function confidenceEnvironmentLabel(state: ConfidenceState): string {
  switch (state) {
    case "ELEVATED_RISK":
      return "Cautious outlook with interpretation sensitivity to operational texture";
    case "MOMENTUM_WEAKENING":
      return "Measured learning boundary as demand/earnings momentum cools";
    case "CONFIDENCE_RISING":
      return "Constructive, structure-supported business evolution";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced observational environment for business-quality interpretation";
    case "STABLE_CONVICTION":
    default:
      return "Stable learning environment for business quality reading";
  }
}

function formatDelta(deltaPct: number | undefined): string | undefined {
  if (typeof deltaPct !== "number" || !Number.isFinite(deltaPct)) return undefined;
  const abs = Math.abs(deltaPct);
  const sign = deltaPct >= 0 ? "+" : "-";
  return `${sign}${abs.toFixed(1)}%`;
}

function keywordToneHints(text: string): string[] {
  const t = text.toLowerCase();
  const hints: string[] = [];

  if (/(cautious|caution|conservative|watch|remain cautious|guarded)/i.test(t)) hints.push("cautious");
  if (/(efficient|efficiency|discipline|cost|optimi|pru(dence)?)/i.test(t)) hints.push("efficiency-first");
  if (/(margin|profit|operating margin|profitability)/i.test(t)) hints.push("margin-focused");
  if (/(steady|stable|consistent|maintain)/i.test(t)) hints.push("consistency");
  if (/(expand|growth|invest|capacity|scaling)/i.test(t)) hints.push("expansion-focus");
  if (/(resilient|resilience|strong|robust)/i.test(t)) hints.push("resilient");
  if (/(debt|leverage|balance sheet|net debt)/i.test(t)) hints.push("balance-sheet aware");

  return hints.slice(0, 4);
}

function businessQualityNarrative(fin: FinancialSnapshot): string {
  const grossMargin = safePct(fin.grossMarginPct);
  const operatingMargin = safePct(fin.operatingMarginPct);
  const fcfMargin = safePct(fin.freeCashFlowMarginPct);
  const expenseGrowth = fin.operatingExpenseGrowthPct; // interpretation: cost discipline if negative

  const netDebtToEbitda = safePct(fin.netDebtToEbitda);
  const interestCoverage = safePct(fin.interestCoverage);

  const gmPart =
    typeof grossMargin === "number"
      ? `Gross margin reads at about ${grossMargin.toFixed(1)}%, shaping business-quality texture.`
      : "Gross margin changes are not fully specified, so business-quality reading stays contextual.";

  const opPart =
    typeof operatingMargin === "number"
      ? `Operating margin is around ${operatingMargin.toFixed(1)}%, suggesting operating efficiency and profitability quality.`
      : "Operating margin changes are not fully specified, so quality reading remains interpretive.";

  const fcfPart =
    typeof fcfMargin === "number"
      ? `Free cash flow margin appears around ${fcfMargin.toFixed(1)}%, supporting cash-generation continuity.`
      : "Cash-flow margin changes are not fully specified, so interpretation focuses on the narrative direction of stability.";

  const expensePart =
    typeof expenseGrowth === "number" && Number.isFinite(expenseGrowth)
      ? expenseGrowth <= 0
        ? `Operating expense evolution suggests discipline (cost growth moderates), which can support steadier margins.`
        : `Operating expense evolution indicates rising cost pressure, which can make margins more sensitive to demand texture.`
      : "Operating expense evolution is not specified; the engine stays calibrated to the management summary and margin signals.";

  const solvencyPart =
    typeof netDebtToEbitda === "number" && typeof interestCoverage === "number"
      ? netDebtToEbitda <= 3
        ? `Leverage and coverage appear balanced, so debt sustainability is interpreted as comparatively resilient.`
        : `Leverage and coverage suggest that debt sustainability needs closer monitoring as environment conditions evolve.`
      : "Debt sustainability inputs are partial; the narrative remains balanced and avoids over-precision.";

  return `${gmPart} ${opPart} ${fcfPart} ${expensePart} ${solvencyPart}`;
}

function managementToneNarrative(conf: ConfidenceState, management: CorporateStoryInputs["management"]): string {
  const combined = [management.summary, management.guidance ?? "", ...(management.managementToneHints ?? [])].join(" ");
  const hints = management.managementToneHints && management.managementToneHints.length ? management.managementToneHints : keywordToneHints(combined);

  const cautious = hints.includes("cautious");
  const efficiencyFirst = hints.includes("efficiency-first");
  const marginFocused = hints.includes("margin-focused");
  const consistency = hints.includes("consistency");
  const expansion = hints.includes("expansion-focus");
  const ba = hints.includes("balance-sheet aware");

  const toneCore = (() => {
    if (cautious && efficiencyFirst) return "Management commentary reflects operational caution alongside an efficiency-first posture.";
    if (cautious) return "Management commentary reflects increased caution in how operational outcomes are framed.";
    if (efficiencyFirst) return "Management emphasis appears increasingly focused on efficiency discipline and operational clarity.";
    if (marginFocused) return "Management communication is margin-aware, connecting profitability quality to operational discipline.";
    if (consistency) return "Management tone reads as steady, prioritising continuity in business execution language.";
    if (expansion) return "Management emphasis suggests growth intent, but framed with context rather than aggressive certainty.";
    return "Management commentary suggests a structured and measured communication style across operational themes.";
  })();

  const riskOverlay =
    conf === "ELEVATED_RISK"
      ? "In an elevated-risk confidence environment, this tone is interpreted as more timing-sensitive and guardrailed."
      : conf === "MOMENTUM_WEAKENING"
        ? "With momentum weakening, the same commentary is read as a controlled adjustment rather than a directional surprise."
        : conf === "CONFIDENCE_RISING"
          ? "Under constructive confidence, the tone is read as supportive of business evolution with disciplined narrative pacing."
          : conf === "NEUTRAL_ENVIRONMENT"
            ? "In a balanced environment, management tone is treated as continuity context rather than an outcome claim."
            : "In stable conviction, management tone is interpreted as composed and structurally aligned.";

  const balanceSheetPart = ba ? "Balance-sheet awareness is explicitly present, reinforcing caution around leverage sensitivity." : "";

  return `${toneCore} ${balanceSheetPart} ${riskOverlay}`.trim();
}

function institutionalReactionNarrative(conf: ConfidenceState, institutional: CorporateStoryInputs["institutional"]): string {
  const tone = typeof institutional.postEarningsTone === "number" ? institutional.postEarningsTone : undefined;
  const quality = typeof institutional.postEarningsVolumeQuality === "number" ? institutional.postEarningsVolumeQuality : undefined;
  const liq = typeof institutional.liquidityParticipation === "number" ? institutional.liquidityParticipation : undefined;

  const toneLine =
    typeof tone === "number"
      ? tone >= 0.25
        ? "Post-earnings institutional posture reads comparatively constructive."
        : tone <= -0.25
          ? "Post-earnings institutional tone reads comparatively cautious."
          : "Post-earnings institutional tone reads mixed and measured."
      : "Institutional tone is partially specified, so interpretation stays balanced and context-first.";

  const volQualityLine =
    typeof quality === "number"
      ? quality >= 0.65
        ? "Volume quality suggests structured participation rather than fragmented reactions."
        : quality <= 0.4
          ? "Volume quality suggests a more selective, possibly narrower participation lens."
          : "Volume quality suggests interpretive balance between participation and selectivity."
      : "Volume quality is not fully specified, so the narrative avoids over-precision.";

  const liqLine =
    typeof liq === "number"
      ? liq >= 0.65
        ? "Liquidity participation appears supportive, which can stabilise how narratives are received in the market environment."
        : liq <= 0.4
          ? "Liquidity participation appears selective, making interpretation more sensitive to exposure texture."
          : "Liquidity participation appears mixed, supporting a balanced interpretive cadence."
      : "Liquidity participation is partially specified, so the narrative stays structurally measured.";

  const confidenceOverlay =
    conf === "ELEVATED_RISK"
      ? "Because the confidence environment is elevated risk, institutional cues are interpreted as maintaining structure while sensitivity rises."
      : conf === "MOMENTUM_WEAKENING"
        ? "Because momentum is weakening, institutional participation is treated as a stabilising cue rather than a directional signal."
        : "Because confidence conditions are not elevated-risk, institutional reaction is interpreted as continuity context.";

  return `${toneLine} ${volQualityLine} ${liqLine} ${confidenceOverlay}`.trim();
}

function marginAndEfficiencyNarrative(fin: FinancialSnapshot): string {
  const gm = safePct(fin.grossMarginPct);
  const om = safePct(fin.operatingMarginPct);
  const fcfm = safePct(fin.freeCashFlowMarginPct);
  const expGrowth = fin.operatingExpenseGrowthPct;

  const gmDelta = fin.grossMarginDeltaPct;
  const omDelta = fin.operatingMarginDeltaPct;
  const fcfDelta = fin.fcfMarginDeltaPct;

  const gmLine =
    typeof gm === "number"
      ? `Gross margin sits near ${gm.toFixed(1)}%, shaping the stability of profitability texture.`
      : "Gross margin baseline is not specified, so margin reading stays contextual.";

  const omLine =
    typeof om === "number"
      ? `Operating margin is around ${om.toFixed(1)}%, which supports the narrative of operating efficiency.`
      : "Operating margin baseline is not specified, so interpretation remains editorial and non-quantitative.";

  const fcfLine =
    typeof fcfm === "number"
      ? `Cash-flow margin appears around ${fcfm.toFixed(1)}%, reinforcing cash generation interpretation.`
      : "Cash-flow margin baseline is not specified; interpretation remains anchored to the management storyline.";

  const expenseLine =
    typeof expGrowth === "number" && Number.isFinite(expGrowth)
      ? expGrowth <= 0
        ? "Operating expense evolution suggests cost discipline supporting margin stability."
        : "Operating expense evolution suggests cost pressure that can make margins more sensitive to demand texture."
      : "Operating expense evolution is not specified; efficiency reading remains balanced.";

  const deltasLine = (() => {
    const parts: string[] = [];

    const gmD = formatDelta(gmDelta);
    if (gmD) parts.push(`gross margin ${gmD}`);
    const omD = formatDelta(omDelta);
    if (omD) parts.push(`operating margin ${omD}`);
    const fcfD = formatDelta(fcfDelta);
    if (fcfD) parts.push(`FCF margin ${fcfD}`);

    if (!parts.length) return "Margin deltas are not fully specified, so the narrative focuses on qualitative stability cues.";

    return `Key efficiency signals show an observed direction via ${parts.join(", ")}.`;
  })();

  return `${gmLine} ${omLine} ${fcfLine} ${expenseLine} ${deltasLine}`.trim();
}

function guidanceInterpretationNarrative(conf: ConfidenceState, management: CorporateStoryInputs["management"]): string {
  const guidance = management.guidance ?? "";
  const sum = management.summary;

  const t = `${guidance} ${sum}`.toLowerCase();

  const cautious =
    /(maintain|remain|cautious|guarded|focus on|prioritise|prioritize|discipline|stable|steady)/i.test(t) ||
    /not expecting/i.test(t);

  const expansionFocus = /(expand|growth|capacity|scale|investment)/i.test(t);

  const guidanceCore = (() => {
    if (cautious && expansionFocus) {
      return "Forward commentary suggests measured expansion emphasis alongside operational discipline.";
    }
    if (cautious) {
      return "Forward commentary reflects increasing focus on operational stability over aggressive acceleration.";
    }
    if (expansionFocus) {
      return "Forward commentary suggests growth intent, framed with context and interpretive caution rather than certainty.";
    }
    return "Forward commentary is interpreted as business evolution context, with emphasis on the operational framing rather than outcomes.";
  })();

  const overlay =
    conf === "ELEVATED_RISK"
      ? "In this elevated-risk environment, the engine treats guidance tone as more timing-sensitive and avoids certainty language."
      : conf === "MOMENTUM_WEAKENING"
        ? "With momentum weakening, forward commentary is read as a controlled adjustment to pacing rather than a directional promise."
        : "In other confidence environments, guidance is treated as interpretive context to place future-facing expectations into structure.";

  return `${guidanceCore} ${overlay}`.trim();
}

function riskEvolutionNarrative(conf: ConfidenceState, fin: FinancialSnapshot): { narrative: string; flags: string[] } {
  const flags: string[] = [];

  const debtDelta = fin.debtDeltaPct;
  const debtToEbitda = fin.netDebtToEbitda;
  const interestCoverage = fin.interestCoverage;

  const gmDelta = fin.grossMarginDeltaPct;
  const omDelta = fin.operatingMarginDeltaPct;
  const fcfDelta = fin.fcfMarginDeltaPct;

  const riskFromMargin = typeof gmDelta === "number" && gmDelta < -1 ? "Margin compression risk (gross)" : undefined;
  const riskFromOpMargin = typeof omDelta === "number" && omDelta < -1 ? "Margin compression risk (operating)" : undefined;

  const riskFromDebt = typeof debtDelta === "number" && debtDelta > 2 ? "Debt pressure evolution" : undefined;
  const solvencyRisk =
    typeof debtToEbitda === "number" && typeof interestCoverage === "number" && (debtToEbitda >= 4.0 || interestCoverage <= 2.5)
      ? "Solvency sensitivity"
      : undefined;

  if (riskFromMargin) flags.push(riskFromMargin);
  if (riskFromOpMargin) flags.push(riskFromOpMargin);
  if (riskFromDebt) flags.push(riskFromDebt);
  if (solvencyRisk) flags.push(solvencyRisk);

  if (conf === "ELEVATED_RISK" && flags.length < 2) {
    flags.push("Interpretive sensitivity increases in elevated-risk confidence conditions");
  }

  if (!flags.length) flags.push("No dominant risk evolution signal; narrative stays balanced");

  const narrative = (() => {
    const parts: string[] = [];
    if (typeof debtDelta === "number") {
      parts.push(
        debtDelta > 0
          ? `Debt-related metrics show an observed change (about ${Math.abs(debtDelta).toFixed(1)}%) that requires structurally careful interpretation.`
          : `Debt-related metrics show a comparatively contained change (about ${Math.abs(debtDelta).toFixed(1)}%), supporting a calmer solvency read.`
      );
    }

    if (typeof omDelta === "number") {
      parts.push(omDelta >= 0 ? `Operating margin direction looks supportive (${formatDelta(omDelta)} observed change).` : `Operating margin direction shows easing (${formatDelta(omDelta)} observed change).`);
    }

    if (typeof fcfDelta === "number") {
      parts.push(fcfDelta >= 0 ? `Cash-flow margin evolves in a supportive direction (${formatDelta(fcfDelta)}).` : `Cash-flow margin evolves with sensitivity (${formatDelta(fcfDelta)}).`);
    }

    if (!parts.length) {
      parts.push("Risk evolution is interpreted structurally rather than confidently: no single dominant negative signal is fully specified, so the story remains balanced.");
    }

    return `${parts.join(" ")} In an educational framework, this risk read updates context without implying certainty of outcomes.`;
  })();

  return { narrative, flags: flags.slice(0, 5) };
}

function executiveNarrative(conf: ConfidenceState, fin: FinancialSnapshot, management: CorporateStoryInputs["management"]): string {
  const toneHints = management.managementToneHints ?? keywordToneHints(`${management.summary} ${management.guidance ?? ""}`);

  const dominantHint =
    toneHints.includes("efficiency-first")
      ? "operational discipline"
      : toneHints.includes("cautious")
        ? "measured caution"
        : toneHints.includes("margin-focused")
          ? "profitability texture"
          : toneHints.includes("expansion-focus")
            ? "contexted expansion"
            : "business continuity";

  const marginDelta = fin.operatingMarginDeltaPct ?? fin.grossMarginDeltaPct;
  const marginPhrase =
    typeof marginDelta === "number"
      ? marginDelta >= 0
        ? `margin stability appears to improve in an observed direction (${formatDelta(marginDelta)}).`
        : `margin stability eases in an observed direction (${formatDelta(Math.abs(marginDelta)) ? formatDelta(marginDelta) : "—"}).`
      : "margin texture remains interpreted through stability cues rather than over-precision.";

  const confLine =
    conf === "ELEVATED_RISK"
      ? "The confidence environment is elevated-risk, so the narrative prioritises how quickly interpretation becomes sensitive to operational texture."
      : conf === "MOMENTUM_WEAKENING"
        ? "Momentum is weakening in this confidence lens, so the narrative treats earnings changes as pacing context."
        : conf === "CONFIDENCE_RISING"
          ? "Confidence is rising, so the narrative reads improvements as structural evolution rather than certainty."
          : conf === "NEUTRAL_ENVIRONMENT"
            ? "The confidence environment is balanced, so the narrative remains continuity-first."
            : "Confidence is stable, so the narrative focuses on structural consistency.";

  return `Executive earnings narrative: ${dominantHint} remains central to the business story. ${marginPhrase} ${confLine}`;
}

function keyOperationalChanges(fin: FinancialSnapshot, management: CorporateStoryInputs["management"]): string[] {
  const lines: string[] = [];

  const gmDelta = fin.grossMarginDeltaPct;
  const omDelta = fin.operatingMarginDeltaPct;
  const fcfDelta = fin.fcfMarginDeltaPct;

  const debtDelta = fin.debtDeltaPct;
  const expenseGrowth = fin.operatingExpenseGrowthPct;

  const gmPart = deltaLine("Gross margin", gmDelta, "gross margin changes remain interpretively contextual");
  const omPart = deltaLine("Operating margin", omDelta, "operating margin changes remain context-led");
  const fcfPart = deltaLine("FCF margin", fcfDelta, "cash-flow margin stays editorially interpreted");

  lines.push(omPart);

  if (typeof gmDelta === "number") lines.push(gmPart);
  if (typeof fcfDelta === "number") lines.push(fcfPart);

  if (typeof expenseGrowth === "number") {
    lines.push(
      expenseGrowth <= 0
        ? "Cost discipline appears increasingly visible, supporting operating leverage interpretation."
        : "Cost pressure appears to evolve upward, which can make margins more sensitive to demand texture."
    );
  }

  if (typeof debtDelta === "number") {
    lines.push(
      debtDelta > 0
        ? "Debt evolution requires structurally careful monitoring in the corporate story."
        : "Debt evolution appears comparatively contained, supporting a calmer solvency read."
    );
  }

  if (!management.summary) {
    // no-op
  }

  // Use management.summary as a gentle “editorial anchor”
  const managementAnchor = management.summary.trim().split(".")[0];
  if (managementAnchor && managementAnchor.length > 10) lines.push(`Management anchors the story with: ${managementAnchor}.`);

  // Keep calm: cap to 5
  return Array.from(new Set(lines)).slice(0, 5);
}

function businessTimelineFromStory(
  inputs: CorporateStoryInputs,
  engineOut: EarningsNarrativeEngineOutput
): { longTermTimeline: { id: string; whenLabel: string; text: string }[] } {
  const { narrativeKey, longTermState } = inputs;

  const seed = narrativeKey % 1000;

  const nextEntryA = {
    id: `lt_${seed}_a`,
    whenLabel: "Management emphasis",
    text: engineOut.managementToneNarrative,
  };

  const nextEntryB = {
    id: `lt_${seed}_b`,
    whenLabel: "Operational evolution",
    text: engineOut.marginAndEfficiencyNarrative,
  };

  const nextEntryC = {
    id: `lt_${seed}_c`,
    whenLabel: "Institutional response",
    text: engineOut.institutionalReactionNarrative,
  };

  const existing = longTermState?.history ?? [];
  const history = [...existing, nextEntryA, nextEntryB, nextEntryC];

  // Timeline should be calm, not bloated
  return { longTermTimeline: history.slice(Math.max(0, history.length - 7)) };
}

/**
 * Earnings Narrative Engine
 * - no recommendations
 * - no certainty/prediction
 * - editorial narratives from business structure + management tone + institutional reaction
 */
export function buildEarningsNarrativeEngineOutput(inputs: CorporateStoryInputs): EarningsNarrativeEngineOutput {
  const { confidenceState, financial, management, institutional, narrativeKey } = inputs;

  const executive = executiveNarrative(confidenceState, financial, management);

  const businessQuality = businessQualityNarrative(financial);

  const managementTone = managementToneNarrative(confidenceState, management);

  const institutionalNarrative = institutionalReactionNarrative(confidenceState, institutional);

  const marginNarr = marginAndEfficiencyNarrative(financial);

  const guidanceNarr = guidanceInterpretationNarrative(confidenceState, management);

  const risk = riskEvolutionNarrative(confidenceState, financial);

  const longTermState = inputs.longTermState;

  const keyChanges = (() => {
    try {
      return keyOperationalChanges(financial, management);
    } catch {
      // Keep safe even if user-supplied data is partial
      return [
        "Operational changes are interpreted through margin texture and management tone, avoiding over-precision.",
        "The narrative stays educational and structurally grounded.",
      ];
    }
  })();

  const confidenceEnvironmentLabelText = confidenceEnvironmentLabel(confidenceState);
  const longTermTimeline = (() => {
    const seed = narrativeKey % 1000;
    const base: { id: string; whenLabel: string; text: string }[] = [];

    if (longTermState?.history?.length) base.push(...longTermState.history);

    const entry1 = {
      id: `tl_${seed}_1`,
      whenLabel: "Earnings story continuity",
      text: "This cycle is treated as an interpretive update: how business quality evolves across margins, cash-flow texture, and management framing.",
    };

    const entry2 = {
      id: `tl_${seed}_2`,
      whenLabel: "Institutional context note",
      text: "Institutional reaction is interpreted as a participation-quality lens rather than a certainty trigger for future outcomes.",
    };

    const entry3 = {
      id: `tl_${seed}_3`,
      whenLabel: "Operational discipline signal",
      text: "Efficiency and margin signals are read as structural cues in the corporate narrative, with balanced risk evolution.",
    };

    const merged = [...base, entry1, entry2, entry3, ...keyChanges.slice(0, 1).map((line, idx) => ({
      id: `tl_${seed}_${4 + idx}`,
      whenLabel: `Operational highlight`,
      text: line,
    }))];

    return merged.slice(Math.max(0, merged.length - 8));
  })();

  return {
    executiveNarrative: executive,
    keyOperationalChanges: keyChanges,
    businessQualityNarrative: businessQuality,
    managementToneNarrative: managementTone,
    institutionalReactionNarrative: institutionalNarrative,
    marginAndEfficiencyNarrative: marginNarr,
    guidanceInterpretationNarrative: guidanceNarr,
    riskEvolutionNarrative: risk.narrative,
    riskFlags: risk.flags,
    longTermTimeline,
    confidenceEnvironmentLabel: confidenceEnvironmentLabelText,
  };
}
