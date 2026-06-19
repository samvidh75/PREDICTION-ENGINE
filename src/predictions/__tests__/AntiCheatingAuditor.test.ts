import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AntiCheatingAuditor } from '../AntiCheatingAuditor';

const mockQuery = vi.fn();

vi.mock('../../db/index', () => ({
  default: { query: (...args: any[]) => mockQuery(...args) },
}));

describe('AntiCheatingAuditor', () => {
  let auditor: AntiCheatingAuditor;

  beforeEach(() => {
    auditor = new AntiCheatingAuditor();
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });
  });

  it('passes when no look-ahead bias exists', async () => {
    const result = await auditor.audit();
    expect(result.passed).toBe(true);
  });

  it('detects look-ahead when validated_at before horizon completes', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '5' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const result = await auditor.audit();
    expect(result.passed).toBe(false);
    expect(result.findings.some((f: string) => f.includes('Look-ahead bias detected'))).toBe(true);
  });

  it('detects missing horizon as failure', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '3' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const result = await auditor.audit();
    expect(result.passed).toBe(false);
    expect(result.findings.some((f: string) => f.includes('NULL prediction_horizon'))).toBe(true);
  });

  it('detects survivorship bias', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '2' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const result = await auditor.audit();
    expect(result.passed).toBe(false);
    expect(result.findings.some((f: string) => f.includes('Survivorship bias'))).toBe(true);
  });

  it('detects retroactive edits', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const result = await auditor.audit();
    expect(result.passed).toBe(false);
    expect(result.findings.some((f: string) => f.includes('Retroactive edit'))).toBe(true);
  });
});
