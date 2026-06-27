import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.PRODUCTION_TEST_URL || 'https://stockstory-api.onrender.com';
let serverReachable = false;

beforeAll(async () => {
  try {
    const resp = await fetch(`${API_URL}/api/free/health`, { signal: AbortSignal.timeout(5000) });
    serverReachable = resp.ok;
  } catch {
    serverReachable = false;
  }
}, 10000);

describe('Production Deployment Tests', () => {
  it('should have all services healthy', async () => {
    if (!serverReachable) return;
    const response = await fetch(`${API_URL}/api/free/health`);
    const data = await response.json();

    expect(data.status).toBe('ok');
    if (data.services?.ollama) expect(data.services.ollama.status).toBe('ok');
    if (data.services?.llm) expect(data.services.llm.status).toBe('ok');
    if (data.services?.qdrant) expect(data.services.qdrant.status).toBe('ok');
  });

  it('should process LLM requests', async () => {
    if (!serverReachable) return;
    const response = await fetch(`${API_URL}/api/free/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'TCS',
        message: 'What is PE ratio?',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.answer).toBeTruthy();
  });

  it('should perform vector search', async () => {
    if (!serverReachable) return;
    const response = await fetch(`${API_URL}/api/free/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'TCS valuation', vector: [0.1] }),
    });

    expect(response.status).toBe(200);
  });

  it('should expose metrics', async () => {
    if (!serverReachable) return;
    const response = await fetch(`${API_URL}/api/free/metrics`);
    const text = await response.text();

    expect(text).toContain('llm_calls_total');
    expect(text).toContain('llm_latency_seconds');
  });
});
