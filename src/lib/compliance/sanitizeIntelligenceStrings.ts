import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { CompanyUniverseModel } from "../../types/CompanyUniverse";
import { applyComplianceCopyFilter } from "./complianceCopyFilter";

export type SanitizeOptions = {
  level?: "educational" | "strict";
};

/**
 * Sanitizes intelligence-generated strings to enforce compliant, educational-only language.
 * - conservative replacements
 * - ensures we never leak advisory/broker-style wording
 */
export function sanitizeNeuralMarketSynthesisStrings(synthesis: NeuralMarketSynthesis, opts: SanitizeOptions = {}): NeuralMarketSynthesis {
  const level = opts.level ?? "educational";

  return {
    ...synthesis,
    confidenceEnvironmentLabel: applyComplianceCopyFilter(synthesis.confidenceEnvironmentLabel, level),
    institutionalBehaviour: applyComplianceCopyFilter(synthesis.institutionalBehaviour, level),
    behaviouralPsychology: applyComplianceCopyFilter(synthesis.behaviouralPsychology, level),
    sectorRotationMatrix: applyComplianceCopyFilter(synthesis.sectorRotationMatrix, level),
    liquidityIntelligenceCore: applyComplianceCopyFilter(synthesis.liquidityIntelligenceCore, level),
    futureProbabilityFramework: applyComplianceCopyFilter(synthesis.futureProbabilityFramework, level),
    narrative: {
      ...synthesis.narrative,
      editorialHeadline: applyComplianceCopyFilter(synthesis.narrative.editorialHeadline, level),
      cinematicBody: applyComplianceCopyFilter(synthesis.narrative.cinematicBody, level),
      conditionsNote: applyComplianceCopyFilter(synthesis.narrative.conditionsNote, level),
    },
    healthometer: {
      ...synthesis.healthometer,
      rationale: applyComplianceCopyFilter(synthesis.healthometer.rationale, level),
      confidenceMarginText: applyComplianceCopyFilter(synthesis.healthometer.confidenceMarginText, level),
    },
    macroGeopolitical: {
      ...synthesis.macroGeopolitical,
      headline: applyComplianceCopyFilter(synthesis.macroGeopolitical.headline, level),
      body: applyComplianceCopyFilter(synthesis.macroGeopolitical.body, level),
    },
    timeline: synthesis.timeline.map((t) => ({
      ...t,
      whenLabel: applyComplianceCopyFilter(t.whenLabel, level),
      text: applyComplianceCopyFilter(t.text, level),
    })),
    scannerCards: synthesis.scannerCards.map((c) => ({
      ...c,
      title: applyComplianceCopyFilter(c.title, level),
      body: applyComplianceCopyFilter(c.body, level),
    })),
  };
}

export function sanitizeCompanyUniverseModelStrings(model: CompanyUniverseModel, opts: SanitizeOptions = {}): CompanyUniverseModel {
  const level = opts.level ?? "educational";

  return {
    ...model,
    marketStateLabel: applyComplianceCopyFilter(model.marketStateLabel, level),
    positioningRailLabel: applyComplianceCopyFilter(model.positioningRailLabel, level),
    narrative: {
      ...model.narrative,
      title: applyComplianceCopyFilter(model.narrative.title, level),
      body: applyComplianceCopyFilter(model.narrative.body, level),
    },
    strategicSummary: applyComplianceCopyFilter(model.strategicSummary, level),
    founders: model.founders.map((l) => ({
      ...l,
      narrativeProfile: applyComplianceCopyFilter(l.narrativeProfile, level),
      philosophy: applyComplianceCopyFilter(l.philosophy, level),
    })),
    leadership: model.leadership.map((l) => ({
      ...l,
      narrativeProfile: applyComplianceCopyFilter(l.narrativeProfile, level),
      philosophy: applyComplianceCopyFilter(l.philosophy, level),
    })),
    foundingTimeline: model.foundingTimeline.map((m) => ({
      ...m,
      title: applyComplianceCopyFilter(m.title, level),
      body: applyComplianceCopyFilter(m.body, level),
    })),
    news: model.news.map((n) => ({
      ...n,
      title: applyComplianceCopyFilter(n.title, level),
      body: applyComplianceCopyFilter(n.body, level),
      recencyLabel: applyComplianceCopyFilter(n.recencyLabel, level),
    })),
    futureProbabilityCapsules: model.futureProbabilityCapsules.map((c) => ({
      ...c,
      body: applyComplianceCopyFilter(c.body, level),
    })),
  };
}
