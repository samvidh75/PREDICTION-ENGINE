/**
 * StockStory Scenario Validation Layer
 *
 * Validates scenario inputs and outputs for:
 * 1. Structural integrity (all required fields present)
 * 2. Mathematical validity (no NaN, Infinity, out-of-bounds)
 * 3. Compliance rules (no forbidden language, proper disclaimers)
 * 4. Data quality (confidence thresholds, completeness checks)
 */

import type {
  ScenarioInput,
  ScenarioOutput,
  ScenarioValidationResult,
} from "./ScenarioTypes";
import { ScenarioRegistry } from "./ScenarioRegistry";
import { containsForbiddenLanguage, safeSimulatedScore } from "./ScenarioUtils";

export class ScenarioValidator {
  /** Validate a scenario input before simulation */
  validateInput(input: ScenarioInput): ScenarioValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ── Structural validation ───────────────────────────────
    if (!input.symbol?.trim()) {
      errors.push("Symbol is required and cannot be empty.");
    }
    if (!input.kind) {
      errors.push("Scenario kind is required.");
    } else if (!ScenarioRegistry.listAllKinds().includes(input.kind)) {
      errors.push(`Unknown scenario kind: "${input.kind}".`);
    }
    if (!input.userFacingName?.trim()) {
      errors.push("userFacingName is required.");
    }
    if (!input.userFacingDescription?.trim()) {
      warnings.push("userFacingDescription is empty — user may not understand the scenario.");
    }

    // ── Mathematical validation ─────────────────────────────
    const assumptions = input.assumptions;
    if (assumptions) {
      for (const [key, value] of Object.entries(assumptions)) {
        if (value == null) continue;
        if (!Number.isFinite(value)) {
          errors.push(`Assumption "${key}" is not a finite number: ${value}`);
        }
      }
    }

    // ── Compliance validation ───────────────────────────────
    const allText = [
      input.userFacingName ?? "",
      input.userFacingDescription ?? "",
    ].join(" ");
    if (containsForbiddenLanguage(allText)) {
      errors.push(
        "Input contains forbidden language (price prediction, guarantee, Buy/Sell)."
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /** Validate a scenario output after simulation */
  validateOutput(output: ScenarioOutput): ScenarioValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ── Structural validation ───────────────────────────────
    if (!output.id) errors.push("Output ID is missing.");
    if (!output.symbol) errors.push("Output symbol is missing.");
    if (!output.scenarioKind) errors.push("Output scenarioKind is missing.");
    if (!output.impact) errors.push("Output impact field is missing.");
    if (!output.limitations || output.limitations.length === 0) {
      errors.push("Output must include at least one limitation.");
    }

    // ── Mathematical validation ─────────────────────────────
    if (output.impact.simulatedScore != null) {
      const safe = safeSimulatedScore(output.impact.simulatedScore);
      if (safe === null) errors.push("simulatedScore is invalid (NaN/Infinity).");
    }
    if (output.impact.scoreDelta != null && !Number.isFinite(output.impact.scoreDelta)) {
      errors.push("scoreDelta is invalid (NaN/Infinity).");
    }
    if (output.confidence != null) {
      if (output.confidence < 0 || output.confidence > 100) {
        errors.push(`Confidence out of range: ${output.confidence}`);
      }
      if (output.confidence < 20) {
        warnings.push(
          `Very low confidence (${output.confidence}%) — results may be unreliable.`
        );
      }
    }

    // ── Compliance validation ───────────────────────────────
    const allText = [
      output.impact.thesisImpact,
      output.impact.financialImpact,
      output.impact.valuationImpact,
      output.impact.earningsImpact,
      output.impact.riskImpact,
      output.impact.technicalImpact,
      output.impact.sectorImpact,
      output.impact.peerImpact,
      ...output.watchNext,
      ...output.reviewTriggers,
      ...output.limitations,
    ].join(" ");

    if (containsForbiddenLanguage(allText)) {
      errors.push(
        "Output contains forbidden language (price prediction, guarantee, Buy/Sell)."
      );
    }

    // Check for required disclaimer
    const hasHypothetical = allText.toLowerCase().includes("hypothetical");
    const hasNotForecast =
      allText.toLowerCase().includes("not a forecast") ||
      allText.toLowerCase().includes("for research use only");

    if (!hasHypothetical) {
      warnings.push("Output should include 'hypothetical' language.");
    }
    if (!hasNotForecast) {
      warnings.push("Output should include 'Not a forecast' disclaimer.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /** Validate a batch of scenario outputs */
  validateBatch(outputs: ScenarioOutput[]): {
    valid: boolean;
    summary: string;
    results: Map<string, ScenarioValidationResult>;
  } {
    const results = new Map<string, ScenarioValidationResult>();
    let errorCount = 0;
    let warningCount = 0;

    for (const output of outputs) {
      const result = this.validateOutput(output);
      results.set(output.id, result);
      if (!result.valid || result.errors.length > 0) errorCount++;
      if (result.warnings.length > 0) warningCount++;
    }

    return {
      valid: errorCount === 0,
      summary: `${outputs.length} outputs validated: ${errorCount} with errors, ${warningCount} with warnings.`,
      results,
    };
  }

  /** Quick check if a scenario trait is adequately simulated */
  validateTrait(
    scenario: ScenarioOutput,
    traitKey: string
  ): { covered: boolean; details: string } {
    const impact = scenario.impact;

    const impactMap: Record<string, string | null> = {
      financial_simulation: impact.financialImpact ?? null,
      valuation_simulation: impact.valuationImpact ?? null,
      earnings_simulation: impact.earningsImpact ?? null,
      risk_simulation: impact.riskImpact ?? null,
      sector_simulation: impact.sectorImpact ?? null,
      technical_simulation: impact.technicalImpact ?? null,
      peer_simulation: impact.peerImpact ?? null,
      thesis_alignment: impact.thesisImpact ?? null,
    };

    const text = impactMap[traitKey];
    if (text === undefined) {
      return { covered: false, details: `Unknown trait key: ${traitKey}` };
    }

    return {
      covered: typeof text === "string" && text.length > 10,
      details: `${traitKey} impact text ${text && text.length > 10 ? "is" : "is NOT"} present and substantive.`,
    };
  }
}
