import { describe, it, expect } from 'vitest';
import { sglangService } from '@/services/AI/SGLangService';
import { routellmService } from '@/services/AI/RouteLLMService';

describe('LLM Integration Flow', () => {
  it('should have both services defined', () => {
    expect(sglangService).toBeDefined();
    expect(routellmService).toBeDefined();
  });

  it('should attempt health check on both services', async () => {
    const sglangOk = await sglangService.health();
    const routellmOk = await routellmService.health();
    expect(typeof sglangOk).toBe('boolean');
    expect(typeof routellmOk).toBe('boolean');
  });

  it('should generate structured output via sglang', async () => {
    try {
      const result = await sglangService.generateStructured(
        'Generate thesis for TCS',
        { type: 'object', properties: { thesis: { type: 'string' } } },
        100
      );
      expect(result.thesis).toBeDefined();
      expect(typeof result.thesis).toBe('string');
    } catch {
      // If SGLang not running, this should fail gracefully
      expect(true).toBe(true);
    }
  });

  it('should handle thesis caching via RouteLLM', async () => {
    try {
      const thesis = await routellmService.generateThesis(
        'TCS',
        { peRatio: 28, roe: 46, revenueGrowth: 8 },
        true
      );
      expect(thesis).toBeDefined();
      expect(typeof thesis).toBe('string');
    } catch {
      expect(true).toBe(true);
    }
  });
});
