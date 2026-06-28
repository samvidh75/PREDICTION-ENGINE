/**
 * ResearchWorkflowOrchestrator — runs analyst research pipelines deterministically.
 */

import { stableHash } from '../../utils/hash';
import { ENGINE_VERSION } from '../../intelligence/version';
import type { AnalystContextLoader } from '../shared/AnalystContext';
import { defaultAnalystContextLoader } from '../shared/AnalystContext';
import { serializeAnalystOutput } from '../shared/AnalystPublicSerializer';
import { AnalystConfidenceScorer } from '../confidence/AnalystConfidenceScorer';
import { AnalystEscalationEngine } from '../confidence/AnalystEscalationEngine';
import { ResearchAuditTrailService } from '../audit/ResearchAuditTrailService';
import { AnalystOutputValidator } from '../validation/AnalystOutputValidator';
import { researchWorkflowPlanner } from './ResearchWorkflowPlanner';
import type {
  EvidenceMap,
  ResearchWorkflowType,
  WorkflowResult,
} from './ResearchWorkflowTypes';

export type WorkflowGenerator = (ctx: {
  symbol?: string;
  sector?: string;
  input: Record<string, unknown>;
  evidenceMap: EvidenceMap;
  limitations: string[];
}) => Promise<Record<string, unknown>>;

export class ResearchWorkflowOrchestrator {
  private generators = new Map<ResearchWorkflowType, WorkflowGenerator>();
  private confidenceScorer = new AnalystConfidenceScorer();
  private escalationEngine = new AnalystEscalationEngine();
  private auditService = new ResearchAuditTrailService();
  private outputValidator = new AnalystOutputValidator();

  constructor(private contextLoader: AnalystContextLoader = defaultAnalystContextLoader) {}

  registerGenerator(type: ResearchWorkflowType, generator: WorkflowGenerator): void {
    this.generators.set(type, generator);
  }

  async run(params: {
    workflowType: ResearchWorkflowType;
    symbol?: string;
    sector?: string;
    userId?: string;
    input?: Record<string, unknown>;
    useLlm?: boolean;
  }): Promise<WorkflowResult> {
    const workflowId = `wf_${stableHash(JSON.stringify(params))}_${Date.now()}`;
    const input = params.input ?? {};
    const limitations: string[] = [];
    const validationWarnings: string[] = [];

    const plan = researchWorkflowPlanner.plan(params.workflowType);

    let evidenceMap: EvidenceMap = { evidence: [], byKind: {}, completeness: 0 };

    if (params.symbol) {
      const company = await this.contextLoader.loadCompany(params.symbol);
      limitations.push(...company.limitations);
      evidenceMap = this.buildEvidenceMap(company.evidence);
      if (!company.documentsAvailable && plan.requiresDocuments) {
        limitations.push('Limited research documents available.');
      }
    } else if (params.sector) {
      const sector = await this.contextLoader.loadSector(params.sector);
      limitations.push(...sector.limitations);
      evidenceMap = this.buildEvidenceMap(sector.evidence);
    } else {
      limitations.push('Insufficient context for full research workflow.');
    }

    const generator = this.generators.get(params.workflowType);
    let output: Record<string, unknown> = {
      headline: 'Limited information',
      summary: 'Insufficient information to generate a complete analyst brief.',
      limitations,
    };

    if (generator) {
      try {
        output = await generator({
          symbol: params.symbol,
          sector: params.sector,
          input,
          evidenceMap,
          limitations: [...limitations],
        });
      } catch {
        output = {
          headline: 'Research unavailable',
          summary: 'This research brief could not be completed safely.',
          limitations: [...limitations, 'Workflow encountered a safe failure.'],
        };
      }
    }

    const validation = this.outputValidator.validate(output);
    if (!validation.passed) {
      validationWarnings.push(...validation.errors);
      output = this.outputValidator.stripUnsafe(output);
    }

    const confidence = this.confidenceScorer.score({
      evidenceCompleteness: evidenceMap.completeness,
      documentAvailability: evidenceMap.evidence.length > 0,
      conflictCount: 0,
      validationWarnings: validationWarnings.length,
      llmUsed: Boolean(params.useLlm),
      deterministicFallback: !params.useLlm,
      materiality: 'low',
      freshnessHours: 0,
      priorConsistency: true,
    });

    const publishDecision = this.escalationEngine.decide({
      confidenceScore: confidence.score,
      validationPassed: validation.passed,
      governanceSensitive: Boolean(output.governanceSensitive),
      unsupportedClaimsRemoved: validation.unsupportedClaimsRemoved,
      materiality: 'low',
    });

    const auditTrailId = this.auditService.record({
      taskId: null,
      workflowId,
      symbol: params.symbol ?? null,
      sector: params.sector ?? null,
      inputHash: stableHash(JSON.stringify(input)),
      dataSnapshotIds: [],
      evidenceIds: evidenceMap.evidence.map((e) => e.id),
      engineVersions: [ENGINE_VERSION],
      promptVersion: params.useLlm ? 'llm-optional' : null,
      outputValidationResult: validation.passed ? 'passed' : 'warnings',
      confidenceScore: confidence.score,
      reviewStatus: publishDecision === 'needs_review' ? 'pending_review' : 'auto_published',
    });

    const publicOutput = serializeAnalystOutput({
      ...output,
      confidence: confidence.label,
      limitations,
      reviewStatus: publishDecision === 'needs_review' ? 'Needs review' : undefined,
      disclaimer: 'This analysis is research-only and not investment advice.',
    });

    return {
      ok: publishDecision !== 'do_not_publish',
      workflowId,
      workflowType: params.workflowType,
      output,
      publicOutput,
      confidenceScore: confidence.score,
      publishDecision,
      limitations,
      auditTrailId,
    };
  }

  private buildEvidenceMap(evidence: EvidenceMap['evidence']): EvidenceMap {
    const byKind: Record<string, typeof evidence> = {};
    for (const e of evidence) {
      if (!byKind[e.kind]) byKind[e.kind] = [];
      byKind[e.kind].push(e);
    }
    const completeness = Math.min(100, evidence.length * 10);
    return { evidence, byKind, completeness };
  }
}

export const defaultWorkflowOrchestrator = new ResearchWorkflowOrchestrator();
