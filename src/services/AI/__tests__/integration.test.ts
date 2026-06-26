import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SGLangService } from '../SGLangService';
import { LLMGateway } from '../LLMGateway';

vi.mock('axios');

const mockAxios = vi.mocked(axios);

describe('SGLangService', () => {
  let service: SGLangService;

  beforeEach(() => {
    service = new SGLangService();
    vi.clearAllMocks();
  });

  it('generateStructured returns parsed JSON from SGLang response', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"analysis": "Strong fundamentals"}', usage: { completion_tokens: 50 } },
    });

    const result = await service.generateStructured(
      'Analyze TCS quality',
      { type: 'object', properties: { analysis: { type: 'string' } } },
      200
    );

    expect(result.analysis).toBe('Strong fundamentals');
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/generate'),
      expect.objectContaining({
        text: expect.stringContaining('Analyze TCS'),
        json_schema: expect.objectContaining({ type: 'object' }),
      }),
      expect.any(Object)
    );
  });

  it('parallelGenerate runs multiple prompts concurrently', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"analysis": "result"}', usage: { completion_tokens: 30 } },
    });

    const prompts = ['prompt1', 'prompt2', 'prompt3'];
    const results = await service.parallelGenerate(prompts, {
      type: 'object',
      properties: { analysis: { type: 'string' } },
    });

    expect(results).toHaveLength(3);
    expect(mockAxios.post).toHaveBeenCalledTimes(3);
  });

  it('analyzeStockParallel returns all four analyses', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"analysis": "test analysis"}', usage: { completion_tokens: 40 } },
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
    expect(typeof analysis.quality).toBe('string');
    expect(typeof analysis.valuation).toBe('string');
    expect(typeof analysis.growth).toBe('string');
    expect(typeof analysis.risk).toBe('string');
  });

  it('generateThesis returns a string', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"thesis": "TCS shows strong fundamentals"}', usage: { completion_tokens: 20 } },
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
      data: { text: '{"analysis": "partial data"}', usage: { completion_tokens: 15 } },
    });

    const analysis = await service.analyzeStockParallel('TEST', {
      roe: null,
      roic: null,
      peRatio: null,
      pbRatio: null,
      revenueGrowth: null,
      debtEquity: null,
    });

    expect(analysis.quality).toBe('partial data');
    expect(analysis.valuation).toBe('partial data');
  });
});

describe('LLMGateway', () => {
  let gateway: LLMGateway;

  beforeEach(() => {
    gateway = new LLMGateway();
    vi.clearAllMocks();
  });

  it('askBot returns answer with confidence', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: '{"answer": "TCS is a quality IT company", "confidence": 0.85}', usage: { completion_tokens: 30 } },
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
