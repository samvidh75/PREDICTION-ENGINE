import { describe, it, expect } from 'vitest';
import { MarketRealityValidator } from '../../src/stockstory/intelligence/validation/MarketRealityValidator';
import { ResearchConsistencyValidator } from '../../src/stockstory/intelligence/validation/ResearchConsistencyValidator';
import { RankingSanityValidator } from '../../src/stockstory/intelligence/validation/RankingSanityValidator';
import { EvidenceBounder } from '../../src/stockstory/intelligence/validation/EvidenceBounder';
import { ValidationRunner } from '../../src/stockstory/intelligence/validation/IntelligenceValidationRunner';
import { SafetyAuditor } from '../../src/stockstory/intelligence/quality/SafetyAuditor';
import { ExplainabilityQA } from '../../src/stockstory/intelligence/quality/ExplainabilityQA';
import { ContradictionDetector } from '../../src/stockstory/intelligence/quality/ContradictionDetector';
import { SectorCalibrationEngine } from '../../src/stockstory/intelligence/calibration/SectorCalibrationEngine';
import { MarketCapCalibrator } from '../../src/stockstory/intelligence/calibration/MarketCapCalibrator';
import { DEFAULT_CALIBRATION } from '../../src/stockstory/intelligence/calibration/CalibrationTypes';

describe('MarketRealityValidator', () => {
  const validator = new MarketRealityValidator();

  it('should pass for a known symbol with valid data', async () => {
    const result = await validator.validate('TCS', {
      sector: 'IT Services', marketCap: 1500000, companyName: 'Tata Consultancy Services',
    });
    expect(result.passed).toBe(true);
  });

  it('should flag unknown symbols', async () => {
    const result = await validator.validate('FAKECORP', {});
    expect(result.passed).toBe(false);
  });

  it('should flag sector mismatches', async () => {
    const result = await validator.validate('RELIANCE', { sector: 'Banking' });
    expect(result.issues.some(i => i.id.includes('sector'))).toBe(true);
  });

  it('should validate a batch of symbols', async () => {
    const summary = await validator.validateBatch(['TCS', 'INFY', 'HDFCBANK']);
    expect(summary.results.length).toBe(3);
  });
});

describe('ResearchConsistencyValidator', () => {
  const validator = new ResearchConsistencyValidator();

  it('should detect high conviction + high risk contradiction', async () => {
    const result = await validator.validate('RELIANCE', { convictionLevel: 0.8, riskLevel: 0.85 });
    expect(result.issues.some(i => i.id.includes('thesis-vs-risk'))).toBe(true);
  });

  it('should pass consistent ratings', async () => {
    const result = await validator.validate('TCS', {
      convictionLevel: 0.7, riskLevel: 0.3, qualityScore: 0.8, momentumScore: 0.7,
    });
    expect(result.passed).toBe(true);
  });

  it('should flag thin evidence with high conviction', async () => {
    const result = await validator.validate('INFY', { convictionLevel: 0.75, evidenceCount: 1 });
    expect(result.issues.some(i => i.id.includes('thin-evidence'))).toBe(true);
  });
});

describe('RankingSanityValidator', () => {
  const validator = new RankingSanityValidator();

  it('should flag high risk in top 10', async () => {
    const result = await validator.validate('RELIANCE', {
      symbol: 'RELIANCE', rank: 5, category: 'momentum', riskScore: 0.85,
    });
    expect(result.issues.some(i => i.id.includes('severe_risk_top'))).toBe(true);
  });
});

describe('EvidenceBounder', () => {
  const bounder = new EvidenceBounder();

  it('should flag insufficient evidence', () => {
    const result = bounder.bound('TEST', [
      { id: 'e1', source: 'BSE', type: 'financial', date: '2024-01-01', ageDays: 300 },
    ]);
    expect(result.hasEnoughEvidence).toBe(false);
  });

  it('should flag no evidence', () => {
    const result = bounder.bound('EMPTY', []);
    expect(result.passed).toBe(false);
  });
});

describe('SafetyAuditor', () => {
  const auditor = new SafetyAuditor();

  it('should detect forbidden investment language', () => {
    const results = auditor.auditLine('test.ts', 1, 'This is a Strong Buy');
    expect(results.some(r => r.category === 'investment')).toBe(true);
  });

  it('should detect backend noise', () => {
    const results = auditor.auditLine('test.ts', 1, 'Using Ollama and CUDA');
    expect(results.some(r => r.category === 'backend')).toBe(true);
  });

  it('should pass clean content', () => {
    const results = auditor.auditLine('report.md', 1, 'Thesis for RELIANCE shows improving fundamentals');
    expect(results.length).toBe(0);
  });
});

describe('ExplainabilityQA', () => {
  const qa = new ExplainabilityQA();

  it('should detect forbidden phrases', () => {
    const result = qa.validateExplanation('RELIANCE', 'This is a multibagger!');
    expect(result.hasForbiddenPhrases).toBe(true);
  });

  it('should pass good research language', () => {
    const result = qa.validateExplanation('TCS', 'Research thesis: improving growth. Based on Q3FY24 data, review risk carefully.');
    expect(result.passed).toBe(true);
  });
});

describe('SectorCalibrationEngine', () => {
  const engine = new SectorCalibrationEngine();

  it('should return calibration for known sectors', () => {
    const cal = engine.getSectorCalibration('Banking');
    expect(cal.keyMetrics).toContain('npaRatio');
  });

  it('should validate PE within sector range', () => {
    expect(engine.isPERangeValid('Banking', 15)).toBe(true);
    expect(engine.isPERangeValid('Banking', 50)).toBe(false);
  });
});

describe('ValidationRunner', () => {
  it('should run multiple validators', async () => {
    const runner = new ValidationRunner();
    runner.add(new MarketRealityValidator());
    const summary = await runner.runAll(['TCS', 'INFY']);
    expect(summary.totalSymbols).toBe(2);
  });
});

describe('DEFAULT_CALIBRATION', () => {
  it('should have all sections', () => {
    expect(DEFAULT_CALIBRATION.sectorOverrides).toBeDefined();
    expect(DEFAULT_CALIBRATION.marketCapBuckets.length).toBe(4);
    expect(Object.keys(DEFAULT_CALIBRATION.sectorOverrides).length).toBeGreaterThanOrEqual(5);
  });
});
