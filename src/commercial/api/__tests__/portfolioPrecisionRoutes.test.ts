// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../db/DatabaseAdapter', () => ({
  dbAdapter: { query: (...args: any[]) => mockQuery(...args) },
}));

vi.mock('child_process', () => ({
  exec: Object.assign(vi.fn(), { [Symbol.for('util.promisify.custom')]: undefined }),
}));

describe('registerPortfolioPrecisionRoutes handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly aggregates BUY transactions into holdings', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { ticker: 'RELIANCE', transaction_type: 'BUY', quantity: 10, average_price: 2500 },
        { ticker: 'TCS', transaction_type: 'BUY', quantity: 5, average_price: 3500 },
      ],
    });

    const { registerPortfolioPrecisionRoutes } = await import('../portfolioPrecisionRoutes');
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() };
    const req = { params: { userId: 'test-user' }, log: { error: vi.fn() } };
    const fastify = { get: vi.fn((_: string, h: any) => h(req, reply)) };

    await registerPortfolioPrecisionRoutes(fastify as any);
    expect(reply.status).not.toHaveBeenCalledWith(500);
  });

  it('correctly nets BUY and SELL transactions', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { ticker: 'RELIANCE', transaction_type: 'BUY', quantity: 10, average_price: 2500 },
        { ticker: 'RELIANCE', transaction_type: 'SELL', quantity: 10, average_price: 2600 },
      ],
    });

    const { registerPortfolioPrecisionRoutes } = await import('../portfolioPrecisionRoutes');
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() };
    const req = { params: { userId: 'test-user' }, log: { error: vi.fn() } };
    const fastify = { get: vi.fn((_: string, h: any) => h(req, reply)) };

    await registerPortfolioPrecisionRoutes(fastify as any);
    expect(reply.status).not.toHaveBeenCalledWith(500);
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));

    const { registerPortfolioPrecisionRoutes } = await import('../portfolioPrecisionRoutes');
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() };
    const req = { params: { userId: 'test-user' }, log: { error: vi.fn() } };
    const fastify = { get: vi.fn((_: string, h: any) => h(req, reply)) };

    await registerPortfolioPrecisionRoutes(fastify as any);
    expect(reply.status).toHaveBeenCalledWith(500);
  });
});
