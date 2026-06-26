import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SGLangService, sglangService } from '../SGLangService';
import { LLMGateway } from '../LLMGateway';

vi.mock('axios');
vi.mock('../../MarketConfigService', () => ({
  marketConfigService: {
    getMarketStatus: vi.fn().mockResolvedValue({ isOpen: true }),
    getDataSource: vi.fn().mockResolvedValue('live'),
    shouldFetchFreshData: vi.fn().mockResolvedValue(true),
  },
}));
vi.mock('../../BatchQueue', () => ({
  batchQueue: {
    enqueue: vi.fn((_key: string, executor: () => Promise<any>) => executor()),
    getQueueSize: vi.fn().mockReturnValue(0),
  },
}));

const mockAxios = vi.mocked(axios);

describe('SGLangService', () => {
  let service: SGLangService;

  beforeEach(() => {
    service = new SGLangService();
    service.useExternal = true;
    vi.clearAllMocks();
  });

  it('generateStructured returns parsed JSON from Ollama response', async () => {
    mockAxios.post.mockResolvedValue({
      data: { response: '{"analysis": "Strong fundamentals"}', usage: { completion_tokens: 50 } },
    });

    const result = await service.generateStructured(
      'Analyze TCS quality',
      { type: 'object', properties: { analysis: { type: 'string' } } },
      200
    );

    expect(result.analysis).toBe('Strong fundamentals');
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({
        model: expect.any(String),
        prompt: expect.stringContaining('Analyze TCS'),
      }),
      expect.any(Object)
    );
  });

  it('parallelGenerate runs multiple prompts concurrently', async () => {
    mockAxios.post.mockResolvedValue({
      data: { response: '{"analysis": "result"}', usage: { completion_tokens: 30 } },
    });

    const prompts = ['prompt1', 'prompt2', 'prompt3'];
    const results = await service.parallelGenerate(prompts, {
      type: 'object',
      properties: { analysis: { type: 'string' } },
    });

    expect(results).toHaveLength(3);
    expect(mockAxios.post).toHaveBeenCalledTimes(3);
  });

  it('analyzeStockParallel returns all four analyses with scores', async () => {
    mockAxios.post.mockResolvedValue({
      data: { response: '{"analysis": "Strong and profitable company with good growth"}', usage: { completion_tokens: 40 } },
    });

    const analysis = await service.analyzeStockParallel('TCS', {
      roe: 46,
      roic: 38,
      peRatio: 28,
      pbRatio: 7,
      revenueGrowth: 8,
      debtEquity: 0.1,
    });

    expect(analysis).toHaveProperty('quality');
    expect(analysis).toHaveProperty('valuation');
    expect(analysis).toHaveProperty('growth');
    expect(analysis).toHaveProperty('risk');
    expect(analysis).toHaveProperty('scores');
    expect(typeof analysis.quality).toBe('string');
    expect(typeof analysis.valuation).toBe('string');
    expect(analysis.scores?.quality).toBeGreaterThanOrEqual(0);
    expect(analysis.scores?.overall).toBeGreaterThanOrEqual(0);
  });

  it('generateThesis returns a string', async () => {
    mockAxios.post.mockResolvedValue({
      data: { response: '{"thesis": "TCS shows strong fundamentals"}', usage: { completion_tokens: 20 } },
    });

    const thesis = await service.generateThesis('TCS', {
      peRatio: 28,
      roe: 46,
      revenueGrowth: 8,
    });

    expect(thesis).toBe('TCS shows strong fundamentals');
  });

  it('health returns true when server responds 200', async () => {
    mockAxios.get.mockResolvedValue({ status: 200 });
    expect(await service.health()).toBe(true);
  });

  it('health returns false when server fails', async () => {
    mockAxios.get.mockRejectedValue(new Error('connection failed'));
    expect(await service.health()).toBe(false);
  });

  it('handles partial data without crashing', async () => {
    mockAxios.post.mockResolvedValue({
      data: { response: '{"analysis": "partial data"}', usage: { completion_tokens: 15 } },
    });

    const analysis = await service.analyzeStockParallel('TEST', {
      roe: null,
      roic: null,
      peRatio: null,
      pbRatio: null,
      revenueGrowth: null,
      debtEquity: null,
    });

    expect(typeof analysis.quality).toBe('string');
    expect(typeof analysis.valuation).toBe('string');
  });
});

describe('LLMGateway', () => {
  let gateway: LLMGateway;

  beforeEach(() => {
    gateway = new LLMGateway();
    sglangService.useExternal = true;
    vi.clearAllMocks();
  });

  it('askBot returns answer with confidence', async () => {
    mockAxios.post.mockResolvedValue({
      data: { response: '{"answer": "TCS is a quality IT company", "confidence": 0.85}', usage: { completion_tokens: 30 } },
    });

    const result = await gateway.askBot('TCS', 'Is this a good company?');
    expect(result.answer).toContain('TCS');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('health delegates to SGLang health', async () => {
    mockAxios.get.mockResolvedValue({ status: 200 });
    expect(await gateway.health()).toBe(true);
  });
});
