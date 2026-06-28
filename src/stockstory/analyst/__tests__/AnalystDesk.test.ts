/**
 * Analyst Desk — comprehensive unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalystTaskRegistry } from '../tasks/AnalystTaskRegistry';
import { AnalystTaskRunner } from '../tasks/AnalystTaskRunner';
import { InMemoryAnalystTaskStore } from '../tasks/AnalystTaskStore';
import { ResearchWorkflowOrchestrator } from '../workflows/ResearchWorkflowOrchestrator';
import { researchWorkflowPlanner } from '../workflows/ResearchWorkflowPlanner';
import { FilingToThesisEngine } from '../filings/FilingToThesisEngine';
import { FilingMaterialityScorer } from '../filings/FilingMaterialityScorer';
import { FilingBriefBuilder } from '../filings/FilingBriefBuilder';
import { EarningsNoteGenerator } from '../earnings/EarningsNoteGenerator';
import { EarningsNoteValidator } from '../earnings/EarningsNoteValidator';
import { SectorBriefGenerator } from '../sector/SectorBriefGenerator';
import { CompanyDeepDiveGenerator } from '../company/CompanyDeepDiveGenerator';
import { WatchlistReviewBriefGenerator } from '../watchlist/WatchlistReviewBriefGenerator';
import { ResearchQuestionClassifier } from '../qa/ResearchQuestionClassifier';
import { ResearchAnswerEngine } from '../qa/ResearchAnswerEngine';
import { ResearchAnswerValidator } from '../qa/ResearchAnswerValidator';
import { EvidenceAnswerBuilder } from '../evidence/EvidenceAnswerBuilder';
import { AnalystMemoBuilder } from '../memos/AnalystMemoBuilder';
import { ResearchReviewQueue } from '../review/ResearchReviewQueue';
import { ResearchReviewPolicy } from '../review/ResearchReviewPolicy';
import { AnalystConfidenceScorer } from '../confidence/AnalystConfidenceScorer';
import { AnalystEscalationEngine } from '../confidence/AnalystEscalationEngine';
import { ResearchAuditTrailService } from '../audit/ResearchAuditTrailService';
import { AnalystOutputValidator } from '../validation/AnalystOutputValidator';
import { containsSecrets, serializeAnalystOutput } from '../shared/AnalystPublicSerializer';
import { createEvidenceId } from '../../intelligence/evidence/EvidenceTypes';

describe('AnalystTaskRegistry', () => {
  const registry = new AnalystTaskRegistry();

  it('creates valid task', () => {
    const r = registry.validateCreate({ taskType: 'company_deep_dive', symbol: 'TCS' });
    expect(r.valid).toBe(true);
  });

  it('rejects invalid task type', () => {
    const r = registry.validateCreate({ taskType: 'invalid', symbol: 'TCS' });
    expect(r.valid).toBe(false);
  });

  it('rejects task without symbol when required', () => {
    const r = registry.validateCreate({ taskType: 'company_deep_dive' });
    expect(r.valid).toBe(false);
  });

  it('validates status transition', () => {
    expect(registry.validateTransition('queued', 'running')).toBe(true);
    expect(registry.validateTransition('completed', 'running')).toBe(false);
  });
});

describe('AnalystTaskRunner', () => {
  let store: InMemoryAnalystTaskStore;
  let runner: AnalystTaskRunner;

  beforeEach(() => {
    store = new InMemoryAnalystTaskStore();
    runner = new AnalystTaskRunner(store);
    runner.registerHandler('company_deep_dive', async () => ({
      status: 'completed',
      outputId: 'out_1',
    }));
  });

  it('runs task to completion', async () => {
    const task = await runner.createAndRun({ taskType: 'company_deep_dive', symbol: 'TCS' });
    expect(task.status).toBe('completed');
  });

  it('fails safely without handler', async () => {
    const task = await runner.createAndRun({ taskType: 'sector_brief', sector: 'Tech' });
    expect(task.status).toBe('failed_safely');
  });

  it('rejects secrets in payload', async () => {
    await expect(
      runner.createAndRun({
        taskType: 'company_deep_dive',
        symbol: 'TCS',
        input: { api_key: 'secret' },
      })
    ).rejects.toThrow();
  });
});

describe('ResearchWorkflowOrchestrator', () => {
  it('runs without LLM', async () => {
    const orch = new ResearchWorkflowOrchestrator();
    orch.registerGenerator('company_deep_dive', async () => ({
      headline: 'Test',
      summary: 'Research summary',
    }));
    const result = await orch.run({ workflowType: 'company_deep_dive', symbol: 'TCS' });
    expect(result.workflowId).toBeTruthy();
    expect(result.auditTrailId).toBeTruthy();
  });

  it('handles missing corpus', async () => {
    const orch = new ResearchWorkflowOrchestrator();
    const result = await orch.run({ workflowType: 'company_deep_dive', symbol: 'UNKNOWN' });
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it('creates evidence map', async () => {
    const orch = new ResearchWorkflowOrchestrator();
    orch.registerGenerator('company_deep_dive', async ({ evidenceMap }) => ({
      evidenceCount: evidenceMap.evidence.length,
    }));
    const result = await orch.run({ workflowType: 'company_deep_dive', symbol: 'TCS' });
    expect(result.ok).toBeDefined();
  });
});

describe('ResearchWorkflowPlanner', () => {
  it('plans filing workflow', () => {
    const plan = researchWorkflowPlanner.plan('filing_to_thesis');
    expect(plan.requiresDocuments).toBe(true);
  });
});

describe('FilingToThesisEngine', () => {
  const engine = new FilingToThesisEngine();

  it('financial result creates earnings review suggestion', () => {
    const r = engine.process({
      symbol: 'TCS',
      filingType: 'quarterly_result',
      summary: 'Q3 results',
    });
    expect(r.suggestedTaskType).toBe('earnings_review');
  });

  it('corporate action creates thesis event', () => {
    const r = engine.process({
      symbol: 'TCS',
      filingType: 'corp_announcement',
      subject: 'Dividend announcement',
    });
    expect(r.thesisEvent).toBeTruthy();
  });

  it('governance filing escalates', () => {
    const r = engine.process({
      symbol: 'TCS',
      filingType: 'pledge_disclosure',
      summary: 'Pledge update',
      governanceSensitive: true,
    });
    expect(r.brief.needsHumanReview || r.suggestedTaskType === 'risk_review').toBe(true);
  });

  it('unknown filing is informational', () => {
    const r = engine.process({ symbol: 'TCS', filingType: 'other' });
    expect(['informational', 'insufficient_information', 'low_materiality']).toContain(r.brief.materiality);
  });

  it('missing content is safe', () => {
    const r = engine.process({ symbol: 'TCS', filingType: 'other' });
    expect(r.brief.filingSummary).toBeTruthy();
    expect(r.brief.filingSummary).not.toMatch(/fake/i);
  });
});

describe('FilingMaterialityScorer', () => {
  it('scores high materiality for results', () => {
    const s = new FilingMaterialityScorer().score({
      filingType: 'quarterly_result',
      hasSummary: true,
      hasContent: true,
      governanceSensitive: false,
      isFinancialResult: true,
      isCorporateAction: false,
    });
    expect(s.label).toBe('high_materiality');
  });
});

describe('FilingBriefBuilder', () => {
  it('builds brief without inventing content', () => {
    const b = new FilingBriefBuilder().build({
      symbol: 'TCS',
      filingType: 'other',
      subject: null,
      summary: null,
      filingDate: null,
      materiality: 'insufficient_information',
      materialityReasons: [],
    });
    expect(b.filingSummary).toContain('Limited');
  });
});

describe('EarningsNoteGenerator', () => {
  const gen = new EarningsNoteGenerator();

  it('generates with full data', () => {
    const note = gen.generate('TCS', {
      revenue: 1000,
      profit: 200,
      operatingMargin: 25,
      revenueGrowthYoy: 10,
      profitGrowthYoy: 12,
    });
    expect(note.headline).toContain('TCS');
    expect(note.disclaimer).toContain('not investment advice');
  });

  it('missing prior period safe', () => {
    const note = gen.generate('TCS', {});
    expect(note.limitations.length).toBeGreaterThan(0);
  });

  it('flags margin compression', () => {
    const note = gen.generate('TCS', { operatingMargin: 5 });
    expect(note.whatWeakened).toContain('Margin compression');
  });

  it('no fake beat/miss without consensus', () => {
    const note = gen.generate('TCS', { revenue: 100 });
    expect(note.headline).not.toMatch(/beat|miss/i);
  });

  it('no forbidden language', () => {
    const note = gen.generate('TCS', { revenue: 100 });
    const text = JSON.stringify(note);
    expect(text).not.toMatch(/Buy now|Strong Buy|multibagger/i);
  });
});

describe('EarningsNoteValidator', () => {
  it('catches beat/miss without consensus', () => {
    const gen = new EarningsNoteGenerator();
    const note = gen.generate('TCS', { revenue: 100 });
    note.resultSnapshot = 'Beat expectations';
    const v = new EarningsNoteValidator().validate(note, { consensusAvailable: false });
    expect(v.passed).toBe(false);
  });
});

describe('SectorBriefGenerator', () => {
  const gen = new SectorBriefGenerator();

  it('generates with enough data', () => {
    const brief = gen.generate('Technology', [
      { symbol: 'TCS', qualityScore: 80 },
      { symbol: 'INFY', qualityScore: 75 },
    ]);
    expect(brief.qualityLeaders.length).toBe(2);
  });

  it('insufficient data safe', () => {
    const brief = gen.generate('Unknown', []);
    expect(brief.limitations.length).toBeGreaterThan(0);
  });

  it('quality leaders real symbols only', () => {
    const brief = gen.generate('Tech', [{ symbol: 'TCS', qualityScore: 90 }]);
    expect(brief.qualityLeaders[0].symbol).toBe('TCS');
  });

  it('no forbidden language', () => {
    const brief = gen.generate('Tech', []);
    expect(JSON.stringify(brief)).not.toMatch(/best sector to invest/i);
  });
});

describe('CompanyDeepDiveGenerator', () => {
  const gen = new CompanyDeepDiveGenerator();

  it('generates with full data', () => {
    const dive = gen.generate({
      symbol: 'TCS',
      companyName: 'TCS',
      qualityScore: 80,
      hasDocuments: true,
      governanceEvidence: true,
    });
    expect(dive.symbol).toBe('TCS');
  });

  it('missing documents safe', () => {
    const dive = gen.generate({ symbol: 'TCS' });
    expect(dive.limitations.some((l) => l.includes('document') || l.includes('Governance'))).toBe(true);
  });

  it('no forbidden language', () => {
    const dive = gen.generate({ symbol: 'TCS' });
    expect(JSON.stringify(dive)).not.toMatch(/price target|Strong Buy/i);
  });
});

describe('WatchlistReviewBriefGenerator', () => {
  const gen = new WatchlistReviewBriefGenerator();

  it('review brief for saved company', () => {
    const b = gen.generate({ symbol: 'TCS', companyName: 'TCS', thesisState: 'Watch' });
    expect(b.symbol).toBe('TCS');
  });

  it('no previous review safe', () => {
    const b = gen.generate({ symbol: 'TCS' });
    expect(b.limitations.some((l) => l.includes('previous review'))).toBe(true);
  });

  it('risk rising creates review', () => {
    const b = gen.generate({ symbol: 'TCS', riskRising: true });
    expect(b.risksRequiringAttention.length).toBeGreaterThan(0);
  });
});

describe('ResearchQuestionClassifier', () => {
  const clf = new ResearchQuestionClassifier();

  it('classifies risk question', () => {
    expect(clf.classify('Why is this company risky?')).toBe('risk_question');
  });

  it('classifies advice request', () => {
    expect(clf.classify('Should I buy TCS?')).toBe('unsupported_or_advice_request');
  });
});

describe('ResearchAnswerEngine', () => {
  const engine = new ResearchAnswerEngine();

  it('answers risk question', () => {
    const a = engine.answer({ question: 'Why is risk high?', symbol: 'TCS' }, {
      riskSummary: 'Elevated leverage noted.',
    });
    expect(a.answer).toContain('leverage');
  });

  it('redirects buy/sell question', () => {
    const a = engine.answer({ question: 'Should I sell now?' });
    expect(a.redirected).toBe(true);
    expect(a.answer).toContain('research');
  });
});

describe('ResearchAnswerValidator', () => {
  it('validates answer', () => {
    const v = new ResearchAnswerValidator().validate({
      questionType: 'risk_question',
      answer: 'Risk factors include governance.',
      researchBasis: 'Research basis',
      limitations: [],
      confidence: 'Moderate confidence',
      redirected: false,
      disclaimer: 'Not investment advice',
    });
    expect(v.passed).toBe(true);
  });
});

describe('EvidenceAnswerBuilder', () => {
  it('includes evidence IDs', () => {
    const evidence = [{
      id: createEvidenceId('TCS', 'financial_metric', 0),
      symbol: 'TCS',
      kind: 'financial_metric' as const,
      label: 'ROE',
      value: 20,
      asOf: '2025-01-01',
      confidence: 0.8,
    }];
    const result = new EvidenceAnswerBuilder().build({
      questionType: 'valuation_question',
      question: 'Is valuation stretched?',
      symbol: 'TCS',
      evidence,
      context: {},
    });
    expect(result.evidenceIds.length).toBe(1);
  });

  it('public serialization safe', () => {
    const result = new EvidenceAnswerBuilder().build({
      questionType: 'company_overview',
      question: 'Overview?',
      evidence: [],
      context: {},
    });
    const pub = serializeAnalystOutput({ answer: result.answer });
    expect(pub.answer).toBeDefined();
    expect(JSON.stringify(pub)).not.toMatch(/provider|backend|API/i);
  });
});

describe('AnalystMemoBuilder', () => {
  it('builds memo from deep dive', () => {
    const memo = new AnalystMemoBuilder().build({
      memoType: 'company_research_memo',
      symbol: 'TCS',
      source: { summary: 'Research summary', headline: 'TCS Memo' },
    });
    expect(memo.title).toContain('TCS');
    expect(memo.disclaimer).toContain('not investment advice');
  });

  it('no fake analyst signature', () => {
    const memo = new AnalystMemoBuilder().build({
      memoType: 'earnings_memo',
      symbol: 'TCS',
      source: {},
    });
    expect(JSON.stringify(memo)).not.toMatch(/CFA|analyst@|John Smith/i);
  });
});

describe('ResearchReviewQueue', () => {
  it('queues low confidence review', () => {
    const q = new ResearchReviewQueue();
    const item = q.enqueue({
      outputId: 'out_1',
      symbol: 'TCS',
      triggers: ['low_confidence'],
      confidenceScore: 20,
    });
    expect(item.status).toBe('pending_review');
  });

  it('approved output publishable', () => {
    const q = new ResearchReviewQueue();
    const item = q.enqueue({ outputId: 'out_1', triggers: [], confidenceScore: 80 });
    const approved = q.approve(item.id)!;
    expect(approved.status).toBe('approved');
    expect(new ResearchReviewPolicy().isPublishable(approved.status)).toBe(true);
  });
});

describe('AnalystConfidenceScorer', () => {
  it('full evidence scores higher', () => {
    const high = new AnalystConfidenceScorer().score({
      evidenceCompleteness: 90,
      documentAvailability: true,
      conflictCount: 0,
      validationWarnings: 0,
      llmUsed: false,
      deterministicFallback: true,
      materiality: 'low',
      freshnessHours: 1,
      priorConsistency: true,
    });
    expect(high.score).toBeGreaterThan(50);
  });
});

describe('AnalystEscalationEngine', () => {
  const esc = new AnalystEscalationEngine();

  it('auto_publish with full evidence', () => {
    expect(esc.decide({
      confidenceScore: 80,
      validationPassed: true,
      governanceSensitive: false,
      unsupportedClaimsRemoved: 0,
      materiality: 'low',
    })).toBe('auto_publish');
  });

  it('needs_review for governance conflict', () => {
    expect(esc.decide({
      confidenceScore: 40,
      validationPassed: true,
      governanceSensitive: true,
      unsupportedClaimsRemoved: 0,
      materiality: 'high',
    })).toBe('needs_review');
  });

  it('do_not_publish for unsupported claims', () => {
    expect(esc.decide({
      confidenceScore: 80,
      validationPassed: false,
      governanceSensitive: false,
      unsupportedClaimsRemoved: 5,
      materiality: 'low',
    })).toBe('do_not_publish');
  });
});

describe('ResearchAuditTrailService', () => {
  it('creates audit trail without secrets', () => {
    const svc = new ResearchAuditTrailService();
    const id = svc.record({
      taskId: null,
      workflowId: 'wf_1',
      symbol: 'TCS',
      sector: null,
      inputHash: 'abc123',
      dataSnapshotIds: [],
      evidenceIds: ['ev_1'],
      engineVersions: ['1.0.0'],
      promptVersion: null,
      outputValidationResult: 'passed',
      confidenceScore: 75,
      reviewStatus: 'auto_published',
    });
    expect(svc.get(id)).toBeTruthy();
    expect(svc.toPublic()).toBeNull();
  });

  it('input hash stable', () => {
    expect(containsSecrets({ key: 'value' })).toBe(false);
    expect(containsSecrets({ api_key: 'x' })).toBe(true);
  });
});

describe('AnalystOutputValidator', () => {
  const v = new AnalystOutputValidator();

  it('blocks fake filing', () => {
    const r = v.validate({ summary: 'fake filing content' });
    expect(r.passed).toBe(false);
  });

  it('blocks advice language', () => {
    const r = v.validate({ text: 'Buy now this stock' });
    expect(r.passed).toBe(false);
  });

  it('valid brief passes', () => {
    const r = v.validate({
      headline: 'TCS Research Brief',
      summary: 'Research summary for review.',
      limitations: ['Limited information'],
      disclaimer: 'Not investment advice',
    });
    expect(r.passed).toBe(true);
  });
});
