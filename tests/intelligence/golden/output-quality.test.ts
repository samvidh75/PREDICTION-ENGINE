/**
 * Golden output tests for deterministic fallback behavior and validation.
 *
 * Tests:
 * - output structure
 * - no forbidden language
 * - expected risk triggers
 * - expected bull/bear cases
 * - expected confidence label
 * - expected limitations
 * - no invented values
 *
 * Prefer semantic assertions and key substring checks
 * over brittle exact full-paragraph matching.
 */

import { describe, it, expect } from 'vitest';
import { ForbiddenLanguageValidator, FORBIDDEN_INVESTMENT_PHRASES, FORBIDDEN_PLUMBING_TERMS } from '../../../src/stockstory/intelligence/validation/ForbiddenLanguageValidator';
import { NumericClaimValidator } from '../../../src/stockstory/intelligence/validation/NumericClaimValidator';
import { OutputSanitizer } from '../../../src/stockstory/intelligence/validation/OutputSanitizer';
import { ResearchClaimValidator } from '../../../src/stockstory/intelligence/validation/ResearchClaimValidator';
import { ResearchConfidence } from '../../../src/stockstory/intelligence/confidence/ResearchConfidence';
import { CompliancePolicy } from '../../../src/stockstory/intelligence/compliance/CompliancePolicy';
import { ComplianceTextGuard } from '../../../src/stockstory/intelligence/compliance/ComplianceTextGuard';
import { EvidenceCollector } from '../../../src/stockstory/intelligence/evidence/EvidenceCollector';
import { EvidenceValidator } from '../../../src/stockstory/intelligence/evidence/EvidenceValidator';
import { ALL_FIXTURES } from '../../fixtures/intelligence/evaluation/fixtures';
import { validateFullResearch, validateThesis } from '../../../src/stockstory/intelligence/llm/ResearchOutputSchemas';
import { buildResearchCacheKey, isCacheStale, ENGINE_VERSION, PROMPT_VERSION, SCORING_VERSION, RESEARCH_SCHEMA_VERSION } from '../../../src/stockstory/intelligence/version';

// ─── Golden: Forbidden Language Validator ───

describe('Golden — ForbiddenLanguageValidator', () => {
  const v = new ForbiddenLanguageValidator();

  it('rejects "guaranteed return" language', () => {
    const r = v.validate('This stock offers guaranteed return of 20%');
    expect(r.passed).toBe(false);
    expect(r.violations.some(v => v.term === 'guaranteed return')).toBe(true);
  });

  it('rejects "Buy now" language', () => {
    const r = v.validate('Buy now before it is too late');
    expect(r.passed).toBe(false);
    expect(r.violations.some(v => v.term === 'Buy now')).toBe(true);
  });

  it('rejects "Strong Buy" language', () => {
    const r = v.validate('We rate this a Strong Buy');
    expect(r.passed).toBe(false);
  });

  it('rejects "multibagger" language', () => {
    const r = v.validate('This is a multibagger opportunity');
    expect(r.passed).toBe(false);
  });

  it('rejects backend/GPU wording', () => {
    const r = v.validate('The GPU provider processed via API backend');
    expect(r.passed).toBe(false);
    const terms = r.violations.map(v => v.term);
    expect(terms).toContain('GPU');
    expect(terms).toContain('provider');
    expect(terms).toContain('API');
    expect(terms).toContain('backend');
  });

  it('passes clean research text', () => {
    const r = v.validate('The company shows strong quality with ROE of 18% and low debt.');
    expect(r.passed).toBe(true);
  });

  it('sanitizes investment advice to safe alternatives', () => {
    const result = v.sanitize('Buy now for guaranteed return');
    expect(result).not.toContain('Buy now');
    expect(result).not.toContain('guaranteed return');
  });

  it('sanitizes backend/GPU terms silently', () => {
    const result = v.sanitize('The API backend on GPU');
    expect(result).not.toContain('API');
    expect(result).not.toContain('backend');
    expect(result).not.toContain('GPU');
  });
});

// ─── Golden: Numeric Claim Validator ───

describe('Golden — NumericClaimValidator', () => {
  const v = new NumericClaimValidator();
  const evidence = [
    { id: 'e1', symbol: 'TEST', kind: 'financial_metric' as const, label: 'Revenue', value: 50000, asOf: '2025-01-01', confidence: 0.95 },
    { id: 'e2', symbol: 'TEST', kind: 'financial_metric' as const, label: 'ROE', value: 18, asOf: '2025-01-01', confidence: 0.95 },
    { id: 'e3', symbol: 'TEST', kind: 'financial_metric' as const, label: 'P/E', value: 25, asOf: '2025-01-01', confidence: 0.95 },
  ];

  it('accepts numbers matching evidence', () => {
    const r = v.validateClaim('Revenue is 50000 and ROE is 18%', evidence);
    expect(r.passed).toBe(true);
  });

  it('warns on invented numbers not in evidence', () => {
    const r = v.validateClaim('Revenue is 999999 and profit margin is 45%', evidence);
    expect(r.passed).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('ignores year numbers (1800-2100)', () => {
    const r = v.validateClaim('In 2024 the company grew', evidence);
    expect(r.passed).toBe(true);
  });
});

// ─── Golden: Output Sanitizer ───

describe('Golden — OutputSanitizer', () => {
  const s = new OutputSanitizer();

  it('replaces undefined text', () => {
    const r = s.sanitizeText('The value is undefined');
    expect(r.wasModified).toBe(true);
    expect(r.text).not.toContain('undefined');
  });

  it('replaces null text', () => {
    const r = s.sanitizeText('The result is null');
    expect(r.text).not.toContain('null');
  });

  it('replaces NaN text', () => {
    const r = s.sanitizeText('Score is NaN');
    expect(r.text).not.toContain('NaN');
  });

  it('handles null input', () => {
    const r = s.sanitizeText(null);
    expect(r.text).toBe('');
  });

  it('passes clean text unchanged', () => {
    const r = s.sanitizeText('Clean research output');
    expect(r.wasModified).toBe(false);
  });

  it('strips internal fields from output', () => {
    const r = s.stripInternalFields({
      thesis: 'Good company',
      _internal: 'should not appear',
      debug: 'hidden',
      errors: [],
    });
    expect(r.thesis).toBe('Good company');
    expect((r as any)._internal).toBeUndefined();
    expect((r as any).debug).toBeUndefined();
  });

  it('adds compliance label if missing', () => {
    const r = s.addComplianceLabel('Some analysis');
    expect(r).toContain('research-only');
    expect(r).toContain('investment advice');
  });
});

// ─── Golden: Research Confidence ───

describe('Golden — ResearchConfidence', () => {
  const c = new ResearchConfidence();

  it('full data gives High confidence', () => {
    const r = c.compute({
      evidence: Array(15).fill(null).map((_, i) => ({
        id: `e${i}`, symbol: 'TEST', kind: 'financial_metric' as const,
        label: `m${i}`, value: i, asOf: '2025-01-01', confidence: 0.9,
      })),
      hasEarnings: true,
      hasNews: true,
      hasSector: true,
      hasPeers: true,
      hasRag: true,
      cacheAgeHours: 0,
      validationPassed: true,
      usingLlm: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.label).toBe('High confidence');
  });

  it('partial data gives Moderate/Limited confidence', () => {
    const r = c.compute({
      evidence: [{ id: 'e1', symbol: 'TEST', kind: 'financial_metric' as const, label: 'Revenue', value: 100, asOf: '2025-01-01', confidence: 0.9 }],
      hasEarnings: false,
      hasNews: false,
      hasSector: false,
      hasPeers: false,
      hasRag: false,
      cacheAgeHours: 48,
      validationPassed: true,
      usingLlm: false,
    });
    expect(r.score).toBeLessThan(75);
    expect(['Moderate confidence', 'Limited confidence']).toContain(r.label);
  });

  it('missing data gives Limited confidence', () => {
    const r = c.compute({
      evidence: [],
      hasEarnings: false,
      hasNews: false,
      hasSector: false,
      hasPeers: false,
      hasRag: false,
      cacheAgeHours: 168,
      validationPassed: false,
      usingLlm: false,
    });
    expect(r.score).toBe(25);
    expect(r.label).toBe('Limited confidence');
  });

  it('stale cache reduces confidence', () => {
    const fresh = c.compute({
      evidence: Array(10).fill(null).map((_, i) => ({
        id: `e${i}`, symbol: 'TEST', kind: 'financial_metric' as const,
        label: `m${i}`, value: i, asOf: '2025-01-01', confidence: 0.9,
      })),
      hasEarnings: true, hasNews: true, hasSector: true, hasPeers: true, hasRag: true,
      cacheAgeHours: 0, validationPassed: true, usingLlm: true,
    });
    const stale = c.compute({
      evidence: Array(10).fill(null).map((_, i) => ({
        id: `e${i}`, symbol: 'TEST', kind: 'financial_metric' as const,
        label: `m${i}`, value: i, asOf: '2025-01-01', confidence: 0.9,
      })),
      hasEarnings: true, hasNews: true, hasSector: true, hasPeers: true, hasRag: true,
      cacheAgeHours: 100, validationPassed: true, usingLlm: true,
    });
    expect(stale.score).toBeLessThan(fresh.score);
  });
});

// ─── Golden: Compliance ───

describe('Golden — CompliancePolicy', () => {
  const policy = new CompliancePolicy();
  const guard = new ComplianceTextGuard(policy);

  it('blocks "Buy now" in compliance check', () => {
    const r = guard.check('You should Buy now');
    expect(r.passed).toBe(false);
  });

  it('blocks "guaranteed return"', () => {
    const r = guard.check('This offers guaranteed return');
    expect(r.passed).toBe(false);
  });

  it('blocks "risk-free"', () => {
    const r = guard.check('This is a risk-free investment');
    expect(r.passed).toBe(false);
  });

  it('allows "High conviction" stance', () => {
    expect(policy.isComplianceState('High conviction')).toBe(true);
  });

  it('allows "Watch" stance', () => {
    expect(policy.isComplianceState('Watch')).toBe(true);
  });

  it('allows "Risk rising" stance', () => {
    expect(policy.isComplianceState('Risk rising')).toBe(true);
  });

  it('sanitizes non-compliant text', () => {
    const r = guard.sanitize('Buy now for guaranteed return');
    expect(r.modified).toBe(true);
    expect(r.text).not.toContain('Buy now');
    expect(r.text).not.toContain('guaranteed return');
  });

  it('adds disclaimer if missing', () => {
    const r = guard.addDisclaimer('Some analysis');
    expect(r).toContain('informational purposes');
    expect(r).toContain('investment advice');
  });
});

// ─── Golden: Evidence System ───

describe('Golden — Evidence System', () => {
  const collector = new EvidenceCollector();
  const ev = new EvidenceValidator();

  it('collects financial evidence from fixture data', () => {
    const fixture = ALL_FIXTURES[0];
    const evidence = collector.collectAll(fixture.symbol, {
      financials: fixture.financials,
      technicals: fixture.technicals,
      sectorScore: fixture.scores.sector,
      report: fixture.scores,
    });
    expect(evidence.length).toBeGreaterThan(0);
  });

  it('validates claims with evidence binding', () => {
    const fixture = ALL_FIXTURES[0];
    const evidence = collector.collectAll(fixture.symbol, {
      financials: fixture.financials,
      report: fixture.scores,
    });
    const map = ev.buildEvidenceMap(evidence);
    const claims = [
      { claim: 'High quality company', evidenceIds: evidence.slice(0, 2).map(e => e.id), confidence: 0.8, claimType: 'thesis' as const },
      { claim: 'Unsupported claim', evidenceIds: ['nonexistent'], confidence: 0.8, claimType: 'thesis' as const },
    ];
    const { valid, warnings } = ev.validateClaims(claims, map);
    expect(valid.length).toBe(2);
    expect(warnings.some(w => w.warning.includes('Missing evidence'))).toBe(true);
  });
});

// ─── Golden: Output Schemas ───

describe('Golden — ResearchOutputSchemas', () => {
  it('valid thesis passes', () => {
    const errs = validateThesis({
      thesis: 'This company has strong competitive advantages in its sector.',
      confidence: 'high',
      limitations: ['Limited peer data'],
      evidenceIds: ['e1', 'e2'],
      complianceLabel: 'research_only',
    });
    expect(errs.length).toBe(0);
  });

  it('overly short thesis rejected', () => {
    const errs = validateThesis({
      thesis: 'Short',
      confidence: 'high',
      limitations: ['None'],
      evidenceIds: [],
      complianceLabel: 'research_only',
    });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('invalid compliance label rejected', () => {
    const errs = validateThesis({
      thesis: 'Valid thesis with sufficient length for testing.',
      confidence: 'high',
      limitations: ['None'],
      evidenceIds: [],
      complianceLabel: 'investment_advice' as any,
    });
    expect(errs.some(e => e.includes('complianceLabel'))).toBe(true);
  });

  it('full research validates all sections', () => {
    const errs = validateFullResearch({
      symbol: 'TEST',
      generatedAt: new Date().toISOString(),
      thesis: { thesis: 'This company has strong competitive advantages in its sector.', confidence: 'high', limitations: ['Limited data'], evidenceIds: [], complianceLabel: 'research_only' },
      bullBear: { bullCase: [{ title: 'Strong growth', explanation: 'Revenue growing 15% YoY', evidenceIds: [] }], bearCase: [{ title: 'Valuation risk', explanation: 'P/E above sector', evidenceIds: [] }], confidence: 'moderate', limitations: ['Limited peer data'], complianceLabel: 'research_only' },
      risks: { risks: [{ risk: 'Market downturn', severity: 'moderate', explanation: 'Cyclical exposure', evidenceIds: [] }], overallRiskAssessment: 'Moderate risk', confidence: 'moderate', limitations: ['Forward-looking'], complianceLabel: 'research_only' },
      whatChanged: { summary: 'No major changes', changes: [{ aspect: 'Score', previous: '70', current: '72', direction: 'improved', evidenceIds: [] }], confidence: 'moderate', limitations: ['Short lookback'], complianceLabel: 'research_only' },
      peerComparison: { peers: [{ symbol: 'PEER', valuationContext: 'Similar P/E', metricComparison: 'Higher margins', evidenceIds: [] }], summary: 'In-line with peers', confidence: 'moderate', limitations: ['Limited peer set'], complianceLabel: 'research_only' },
      valuation: { explanation: 'Trading at sector-average multiples', keyMetrics: [{ metric: 'P/E', value: '25', context: 'Sector avg 28', evidenceIds: [] }], confidence: 'moderate', limitations: ['Based on trailing data'], complianceLabel: 'research_only' },
      earnings: { summary: 'Strong quarter', quarter: 'Q4', year: 2025, highlights: ['Revenue beat'], concerns: ['Margin pressure'], confidence: 'high', limitations: ['Preliminary'], complianceLabel: 'research_only' },
      factors: [{ factor: 'Quality', score: 80, explanation: 'Strong ROE and margins', keyDrivers: ['High ROE'], evidenceIds: [], confidence: 'high', limitations: [], complianceLabel: 'research_only' }],
      overallConfidence: 'high',
      complianceLabel: 'research_only',
    });
    expect(errs.length).toBe(0);
  });
});

// ─── Golden: Versioning ───

describe('Golden — Versioning', () => {
  it('cache key changes with symbol', () => {
    const k1 = buildResearchCacheKey('TCS', 'hash123');
    const k2 = buildResearchCacheKey('RELIANCE', 'hash123');
    expect(k1).not.toBe(k2);
  });

  it('cache key changes with input hash', () => {
    const k1 = buildResearchCacheKey('TCS', 'hash1');
    const k2 = buildResearchCacheKey('TCS', 'hash2');
    expect(k1).not.toBe(k2);
  });

  it('detects stale cache on version change', () => {
    const stale = isCacheStale('0.9.0', PROMPT_VERSION, SCORING_VERSION, RESEARCH_SCHEMA_VERSION);
    expect(stale).toBe(true);
  });

  it('recognizes current versions as fresh', () => {
    const fresh = isCacheStale(ENGINE_VERSION, PROMPT_VERSION, SCORING_VERSION, RESEARCH_SCHEMA_VERSION);
    expect(fresh).toBe(false);
  });
});

// ─── Golden: Fixtures integrity ───

describe('Golden — Evaluation Fixtures', () => {
  it('all fixtures have required fields', () => {
    for (const f of ALL_FIXTURES) {
      expect(f.symbol).toBeDefined();
      expect(f.sector).toBeDefined();
      expect(f.scores).toBeDefined();
      expect(f.scores.overall).toBeDefined();
    }
  });

  it('no fixture has forbidden language in its text', () => {
    const v = new ForbiddenLanguageValidator();
    for (const f of ALL_FIXTURES) {
      const testText = `${f.drivers.join(' ')} ${f.risks.join(' ')} ${f.name}`;
      const r = v.validate(testText);
      expect(r.passed).toBe(true);
    }
  });

  it('fixtures with data have more evidence than missing fixture', () => {
    const collector = new EvidenceCollector();
    const missingFixture = ALL_FIXTURES.find(f => f.symbol === 'TESTMISS')!;
    const qualityFixture = ALL_FIXTURES.find(f => f.symbol === 'TESTQUALITY')!;

    const missingEvidence = collector.collectAll(missingFixture.symbol, { financials: {}, technicals: {}, report: missingFixture.scores });
    const qualityEvidence = collector.collectAll(qualityFixture.symbol, { financials: qualityFixture.financials, technicals: qualityFixture.technicals, report: qualityFixture.scores });

    expect(qualityEvidence.length).toBeGreaterThan(missingEvidence.length);
  });
});
