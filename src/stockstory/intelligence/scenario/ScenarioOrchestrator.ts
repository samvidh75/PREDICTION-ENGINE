/**
 * StockStory Scenario Orchestrator
 *
 * Chains all 14 scenario subsystems:
 *   1-6. Stress Simulators (Financial, Valuation, Earnings, Risk, Technical, Sector)
 *   7.   Peer Stress Simulator
 *   8.   Thesis Lifecycle Engine
 *   9.   Watchlist Engine
 *   10.  Portfolio Stress Engine
 *   11.  Explainability Engine
 *   12.  Scenario Validator
 *
 * Runs simulators in parallel (following StockStoryOrchestrator pattern),
 * then aggregates through thesis, watchlist, portfolio, explainability, and validation.
 */

import type {
  IntelligenceInput,
  StockIntelligenceReport,
  FinancialEngineOutput,
  TechnicalEngineOutput,
  ValuationEngineOutput,
  RiskEngineOutput,
  SectorEngineOutput,
} from "../types";
import { clampScore, toScoreBand } from "../scoring";
import { financialEngine } from "../engines/FinancialEngine";
import { technicalEngine } from "../engines/TechnicalEngine";
import { valuationEngine } from "../engines/ValuationEngine";
import { riskEngine } from "../engines/RiskEngine";
import { sectorEngine } from "../engines/SectorEngine";
import { earningsEngine } from "../engines/EarningsEngine";

import type {
  ScenarioInput,
  ScenarioOutput,
  ScenarioKind,
  ScenarioAssumptions,
} from "./ScenarioTypes";
import { ScenarioRegistry } from "./ScenarioRegistry";
import { FinancialStressSimulator } from "./FinancialStressSimulator";
import { ValuationStressSimulator } from "./ValuationStressSimulator";
import { EarningsStressSimulator } from "./EarningsStressSimulator";
import { RiskStressSimulator } from "./RiskStressSimulator";
import { TechnicalStressSimulator } from "./TechnicalStressSimulator";
import { SectorStressSimulator } from "./SectorStressSimulator";
import { PeerStressSimulator } from "./PeerStressSimulator";
import { ThesisLifecycleEngine } from "./ThesisLifecycleEngine";
import { WatchlistEngine } from "./WatchlistEngine";
import { PortfolioStressEngine } from "./PortfolioStressEngine";
import { ExplainabilityEngine } from "./ExplainabilityEngine";
import { ScenarioValidator } from "./ScenarioValidator";
import { SCENARIO_PRESETS, buildPresetScenario } from "./ScenarioPresets";

// ─── Types ─────────────────────────────────────────────────────

export interface ScenarioOrchestrationInput {
  /** The base intelligence input (company data) */
  input: IntelligenceInput;
  /** Which scenarios to run */
  scenarios?: ScenarioInput[];
  /** If true, include all 11 preset scenarios */
  includePresets?: boolean;
  /** If true, run peer comparison (requires peer data in input) */
  includePeers?: boolean;
}

export interface ScenarioOrchestrationResult {
  symbol: string;
  exchange: string;
  generatedAt: string;

  /** Base scores before any scenario simulation */
  baseScores: BaseScores;

  /** Results for each scenario that was run */
  scenarioResults: ScenarioOutput[];

  /** Peer-relative results (if peers were available) */
  peerResults?: import("./ScenarioTypes").PeerScenarioResult[];

  /** Thesis assessment across all scenarios */
  thesisAssessment?: import("./ScenarioTypes").ThesisAssessment;
  /** Compound multi-scenario thesis view */
  compoundThesis?: import("./ScenarioTypes").CompoundThesis;

  /** Watchlist items generated from scenario results */
  watchlist?: import("./WatchlistEngine").WatchlistReport;

  /** Portfolio-level stress aggregation */
  portfolioStress?: import("./ScenarioTypes").PortfolioStressOutput;

  /** Explanations for each scenario */
  explanations: import("./ExplainabilityEngine").ScenarioExplanation[];

  /** Validation results for each scenario output */
  validation: import("./ScenarioTypes").ScenarioValidationResult[];

  /** Composite stress score (0-100, how stressed the thesis is) */
  compositeStressScore: number;

  /** Metadata */
  metadata: {
    computationTimeMs: number;
    scenarioEngineVersion: string;
    scenariosRun: number;
  };
}

export interface BaseScores {
  financial: number;
  technical: number;
  valuation: number;
  risk: number;
  sector: number;
  earnings: number;
  composite: number;
}

// ─── Orchestrator ──────────────────────────────────────────────

export class ScenarioOrchestrator {
  private financialStress = new FinancialStressSimulator();
  private valuationStress = new ValuationStressSimulator();
  private earningsStress = new EarningsStressSimulator();
  private riskStress = new RiskStressSimulator();
  private technicalStress = new TechnicalStressSimulator();
  private sectorStress = new SectorStressSimulator();
  private peerStress = new PeerStressSimulator();
  private thesisEngine = new ThesisLifecycleEngine();
  private watchlistEngine = new WatchlistEngine();
  private portfolioEngine = new PortfolioStressEngine();
  private explainer = new ExplainabilityEngine();
  private validator = new ScenarioValidator();

  /**
   * Run the full scenario orchestration pipeline.
   */
  async run(opts: ScenarioOrchestrationInput): Promise<ScenarioOrchestrationResult> {
    const startTime = performance.now();

    // ── Step 1: Run base engines ─────────────────────────────────
    const base = await this.computeBaseScores(opts.input);

    // ── Step 2: Build scenario list ──────────────────────────────
    const scenarios = this.buildScenarioList(opts);

    // ── Step 3: Run all simulators in parallel (per scenario) ────
    const scenarioResults = await this.runScenarios(
      scenarios,
      base,
      opts.input
    );

    // ── Step 4: Peer stress (if requested) ───────────────────────
    let peerResults:
      | import("./ScenarioTypes").PeerScenarioResult[]
      | undefined;
    if (opts.includePeers && opts.input.peers?.length) {
      peerResults = await this.runPeerStress(
        scenarioResults,
        opts.input.peers as unknown as StockIntelligenceReport[]
      );
    }

    // ── Step 5: Thesis assessment ────────────────────────────────
    const thesisAssessment = scenarioResults.length > 0
      ? this.thesisEngine.assess(scenarioResults[0])
      : undefined;
    const compoundThesis = scenarioResults.length > 1
      ? this.thesisEngine.assessMultiple(scenarioResults)
      : undefined;

    // ── Step 6: Watchlist generation ─────────────────────────────
    const watchlistReports = this.watchlistEngine.generateFromScenarios(scenarioResults);
    const watchlist = watchlistReports.length > 0
      ? watchlistReports[0]
      : undefined;

    // ── Step 7: Portfolio stress ─────────────────────────────────
    const portfolioStress = this.portfolioEngine.aggregate(
      opts.input.symbol,
      scenarioResults
    );

    // ── Step 8: Explainability ───────────────────────────────────
    const explanations = scenarioResults.map((s) => this.explainer.explain(s));

    // ── Step 9: Validation ───────────────────────────────────────
    const validation = scenarioResults.map((s) =>
      this.validator.validateOutput(s)
    );

    // ── Step 10: Composite stress score ──────────────────────────
    const compositeStressScore = this.computeCompositeStress(scenarioResults);

    return {
      symbol: opts.input.symbol,
      exchange: opts.input.exchange,
      generatedAt: new Date().toISOString(),
      baseScores: base,
      scenarioResults,
      peerResults,
      thesisAssessment,
      compoundThesis,
      watchlist,
      portfolioStress,
      explanations,
      validation,
      compositeStressScore,
      metadata: {
        computationTimeMs: Math.round(performance.now() - startTime),
        scenarioEngineVersion: "1.0.0",
        scenariosRun: scenarioResults.length,
      },
    };
  }

  // ── Base score computation ────────────────────────────────────

  private async computeBaseScores(input: IntelligenceInput): Promise<BaseScores> {
    const [financial, technical, valuation, risk, sector, earnings] =
      await Promise.all([
        Promise.resolve(financialEngine.analyze(input)),
        Promise.resolve(technicalEngine.analyze(input)),
        Promise.resolve(valuationEngine.analyze(input)),
        Promise.resolve(riskEngine.analyze(input)),
        Promise.resolve(sectorEngine.analyze(input)),
        Promise.resolve(earningsEngine.analyze(input)),
      ]);

    const composite = clampScore(
      (financial.score + technical.score + valuation.score +
       risk.score + sector.score + earnings.score) / 6
    );

    return {
      financial: financial.score,
      technical: technical.score,
      valuation: valuation.score,
      risk: risk.score,
      sector: sector.score,
      earnings: earnings.score,
      composite,
    };
  }

  // ── Scenario list builder ─────────────────────────────────────

  private buildScenarioList(
    opts: ScenarioOrchestrationInput
  ): ScenarioInput[] {
    const scenarios: ScenarioInput[] = [];

    // User-specified scenarios
    if (opts.scenarios?.length) {
      scenarios.push(...opts.scenarios);
    }

    // Presets (if requested)
    if (opts.includePresets) {
      for (let i = 0; i < SCENARIO_PRESETS.length; i++) {
        scenarios.push(
          buildPresetScenario(opts.input.symbol, i)
        );
      }
    }

    return scenarios;
  }

  // ── Parallel scenario runner ──────────────────────────────────

  private async runScenarios(
    scenarios: ScenarioInput[],
    base: BaseScores,
    input: IntelligenceInput
  ): Promise<ScenarioOutput[]> {
    return Promise.all(
      scenarios.map((scenario) =>
        Promise.resolve(this.runSingleScenario(scenario, base, input))
      )
    );
  }

  private runSingleScenario(
    scenario: ScenarioInput,
    base: BaseScores,
    input: IntelligenceInput
  ): ScenarioOutput {
    const assumptions = scenario.assumptions ?? {};
    const kind = scenario.kind;

    // Build lightweight base objects for simulators
    const financialBase: FinancialEngineOutput = {
      score: base.financial,
      confidence: 50,
      reasoning: "Base financial score",
      quality: base.financial,
      growth: base.financial,
      leverage: base.financial,
    };

    const technicalBase: TechnicalEngineOutput = {
      score: base.technical,
      confidence: 50,
      reasoning: "Base technical score",
    };

    const valuationBase: ValuationEngineOutput = {
      score: base.valuation,
      confidence: 50,
      reasoning: "Base valuation score",
    };

    const riskBase: RiskEngineOutput = {
      score: base.risk,
      confidence: 50,
      reasoning: "Base risk score",
    };

    const sectorBase: SectorEngineOutput = {
      score: base.sector,
      confidence: 50,
      reasoning: "Base sector score",
    };

    // Route to appropriate simulator based on kind
    switch (kind) {
      case "financial_stress":
      case "financial":
        return this.financialStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          financialBase,
          this.financialStress.simulate(financialBase, assumptions)
        );

      case "valuation_stress":
      case "valuation":
        return this.valuationStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          valuationBase,
          this.valuationStress.simulate(valuationBase, assumptions)
        );

      case "earnings_stress":
      case "earnings":
        return this.earningsStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          financialBase,
          this.earningsStress.simulate(financialBase, assumptions)
        );

      case "risk_stress":
      case "risk":
        return this.riskStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          riskBase,
          this.riskStress.simulate(riskBase, assumptions)
        );

      case "technical_stress":
      case "technical":
        return this.technicalStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          technicalBase,
          this.technicalStress.simulate(technicalBase, assumptions)
        );

      case "sector_stress":
      case "sector":
        return this.sectorStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          sectorBase,
          this.sectorStress.simulate(sectorBase, assumptions)
        );

      case "peer_stress":
      case "peer":
        // Peer requires additional data — fallback to risk assessment
        return this.riskStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          riskBase,
          this.riskStress.simulate(riskBase, assumptions)
        );

      default:
        // Unknown kind — run as generic risk assessment
        return this.riskStress.buildScenarioOutput(
          input.symbol,
          assumptions,
          riskBase,
          this.riskStress.simulate(riskBase, assumptions)
        );
    }
  }

  // ── Peer stress ───────────────────────────────────────────────

  private async runPeerStress(
    results: ScenarioOutput[],
    peers: StockIntelligenceReport[]
  ): Promise<import("./ScenarioTypes").PeerScenarioResult[]> {
    return this.peerStress.simulate(results, peers);
  }

  // ── Composite stress score ────────────────────────────────────

  private computeCompositeStress(results: ScenarioOutput[]): number {
    if (results.length === 0) return 50;

    // Average absolute score delta across all scenarios
    const totalDelta = results.reduce((sum, r) => {
      return sum + Math.abs(r.impact.scoreDelta ?? 0);
    }, 0);

    const avgDelta = totalDelta / results.length;

    // Map to 0-100: 0 delta = calm (score 0 stress), 20+ delta = high stress (score 100)
    const stressScore = Math.min(100, (avgDelta / 20) * 100);

    return Math.round(stressScore);
  }
}

// ── Singleton export ───────────────────────────────────────────

export const scenarioOrchestrator = new ScenarioOrchestrator();
