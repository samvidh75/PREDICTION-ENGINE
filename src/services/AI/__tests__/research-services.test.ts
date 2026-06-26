import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ResearchBotService } from '../ResearchBotService';
import { ScoreExplanationService } from '../ScoreExplanationService';
import { StockSnapshotService } from '../StockSnapshotService';
import { StockComparisonService } from '../StockComparisonService';
import { ScannerThesisService } from '../ScannerThesisService';
import { ThesisTrackingService } from '../ThesisTrackingService';

vi.mock('axios');
vi.mock('../../../db/index', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

const mockAxios = vi.mocked(axios);

function mockSglangResponse(text: string) {
  mockAxios.post.mockResolvedValue({
    data: { text, usage: { completion_tokens: 50 } },
  });
}

describe('ResearchBotService', () => {
  let service: ResearchBotService;

  beforeEach(() => {
    service = new ResearchBotService();
    vi.clearAllMocks();
  });

  it('returns answer with sessionId', async () => {
    mockSglangResponse('{"answer": "TCS has strong fundamentals with high ROE."}');
    const result = await service.chat('TCS', 'How is TCS doing?');
    expect(result.answer).toContain('TCS');
    expect(result.sessionId).toBeTruthy();
  });

  it('reuses existing session when sessionId provided', async () => {
    mockSglangResponse('{"answer": "Following up on TCS."}');
    const result = await service.chat('TCS', 'Tell me more', 'session-123');
    expect(result.sessionId).toBe('session-123');
  });
});

describe('ScoreExplanationService', () => {
  let service: ScoreExplanationService;

  beforeEach(() => {
    service = new ScoreExplanationService();
    vi.clearAllMocks();
  });

  it('generates structured explanation with strengths and weaknesses', async () => {
    mockSglangResponse(JSON.stringify({
      summary: 'TCS scores well on quality and stability but valuation is demanding.',
      strengths: ['High ROE of 46%', 'Strong balance sheet with zero debt'],
      weaknesses: ['Premium valuation at 28x PE', 'Moderate revenue growth of 8%'],
    }));

    const result = await service.generateScoreExplanation({
      symbol: 'TCS', companyName: 'TCS Ltd',
      score: 72, quality: 85, valuation: 35, growth: 55,
      stability: 80, momentum: 60, risk: 25,
    });

    expect(result.summary).toBeTruthy();
    expect(result.strengths.length).toBe(2);
    expect(result.weaknesses.length).toBe(2);
  });

  it('returns empty arrays when SGLang returns incomplete data', async () => {
    mockSglangResponse('{"summary": "Test summary"}');
    const result = await service.generateScoreExplanation({
      symbol: 'TEST', companyName: 'Test',
      score: 50, quality: 50, valuation: 50, growth: 50,
      stability: 50, momentum: 50, risk: 50,
    });
    expect(result.summary).toBe('Test summary');
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.weaknesses)).toBe(true);
  });
});

describe('StockSnapshotService', () => {
  let service: StockSnapshotService;

  beforeEach(() => {
    service = new StockSnapshotService();
    vi.clearAllMocks();
  });

  it('generates snapshot with all four analysis dimensions', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"analysis": "Strong margins and ROE"}', usage: { completion_tokens: 30 } },
    });

    const result = await service.generateSnapshot({
      symbol: 'TCS', price: 3450, changePercent: 1.2,
      peRatio: 28, pbRatio: 7, roe: 46, roic: 38,
      revenueGrowth: 8, debtEquity: 0.1, marketCap: 1200000,
    });

    expect(result.symbol).toBe('TCS');
    expect(result.price).toBe(3450);
    expect(result.analysis.quality).toBeTruthy();
    expect(result.analysis.valuation).toBeTruthy();
    expect(result.analysis.growth).toBeTruthy();
    expect(result.analysis.risk).toBeTruthy();
    expect(result.generatedAt).toBeTruthy();
  });
});

describe('StockComparisonService', () => {
  let service: StockComparisonService;

  beforeEach(() => {
    service = new StockComparisonService();
    vi.clearAllMocks();
  });

  it('compares multiple stocks and returns rankings', async () => {
    mockSglangResponse(JSON.stringify({
      rankings: [
        { symbol: 'TCS', rank: 1, summary: 'Best quality and stability' },
        { symbol: 'INFY', rank: 2, summary: 'Good growth at fair valuation' },
      ],
      recommendation: 'TCS leads on quality and stability metrics.',
      keyDifferences: ['TCS has higher ROE', 'INFY has better valuation'],
    }));

    const result = await service.compare([
      { symbol: 'TCS', companyName: 'TCS Ltd', score: 75, quality: 85, valuation: 35, growth: 55, stability: 80, momentum: 60, risk: 25 },
      { symbol: 'INFY', companyName: 'Infosys', score: 70, quality: 75, valuation: 55, growth: 60, stability: 70, momentum: 55, risk: 30 },
    ]);

    expect(result.rankings.length).toBe(2);
    expect(result.recommendation).toBeTruthy();
    expect(result.keyDifferences.length).toBeGreaterThan(0);
  });

  it('returns message when fewer than 2 stocks provided', async () => {
    const result = await service.compare([{ symbol: 'TCS', companyName: 'TCS Ltd', score: 75, quality: 85, valuation: 35, growth: 55, stability: 80, momentum: 60, risk: 25 }]);
    expect(result.recommendation).toContain('at least one more');
  });
});

describe('ScannerThesisService', () => {
  let service: ScannerThesisService;

  beforeEach(() => {
    service = new ScannerThesisService();
    vi.clearAllMocks();
  });

  it('generates one-line thesis', async () => {
    mockSglangResponse('{"thesis": "TCS offers best-in-class IT services with industry-leading margins."}');
    const thesis = await service.generateThesis({
      symbol: 'TCS', companyName: 'TCS Ltd',
      score: 75, quality: 85, valuation: 35, growth: 55, momentum: 60,
    });
    expect(thesis).toBeTruthy();
    expect(typeof thesis).toBe('string');
  });

  it('batch generates theses for multiple stocks', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"thesis": "Generic thesis"}', usage: { completion_tokens: 20 } },
    });
    const results = await service.batchGenerate([
      { symbol: 'TCS', companyName: 'TCS Ltd', score: 75, quality: 85, valuation: 35, growth: 55, momentum: 60 },
      { symbol: 'INFY', companyName: 'Infosys', score: 70, quality: 75, valuation: 55, growth: 60, momentum: 55 },
    ]);
    expect(results.length).toBe(2);
    expect(results[0].symbol).toBe('TCS');
    expect(results[1].symbol).toBe('INFY');
  });
});

describe('ThesisTrackingService', () => {
  let service: ThesisTrackingService;

  beforeEach(() => {
    service = new ThesisTrackingService();
    vi.clearAllMocks();
  });

  it('detects improvement when score increases significantly', async () => {
    mockSglangResponse('{"summary": "TCS score improved from 72 to 82 driven by margin expansion."}');
    const result = await service.detectChange('TCS', 82, 72, 'TCS is a quality IT company.');
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('improving');
    expect(result.summary).toBeTruthy();
  });

  it('detects decline when score drops significantly', async () => {
    mockSglangResponse('{"summary": "TCS score declined from 75 to 62 due to slowing growth."}');
    const result = await service.detectChange('TCS', 62, 75, 'TCS is a quality IT company.');
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('declining');
  });

  it('returns stable when score change is minimal', async () => {
    const result = await service.detectChange('TCS', 73, 75, 'TCS is a quality IT company.');
    expect(result.changed).toBe(false);
    expect(result.direction).toBe('stable');
  });
});
