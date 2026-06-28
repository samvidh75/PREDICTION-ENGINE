import { describe, it, expect } from 'vitest';
import { ResearchCorrectionService } from '../ResearchCorrectionService';

describe('ResearchCorrectionService', () => {
  const service = new ResearchCorrectionService();

  it('creates a correction ticket', () => {
    const ticket = service.createCorrection({
      symbol: 'RELIANCE',
      userId: 'user_1',
      description: 'The PE ratio is outdated in the thesis',
    });
    expect(ticket.id).toMatch(/^corr_/);
    expect(ticket.status).toBe('open');
    expect(ticket.symbol).toBe('RELIANCE');
    expect(ticket.userId).toBe('user_1');
  });

  it('tracks lifecycle from open to resolved', () => {
    const ticket = service.createCorrection({
      symbol: 'TCS',
      userId: 'user_2',
      description: 'Revenue figures are from last quarter',
    });
    expect(ticket.status).toBe('open');

    service.markInReview(ticket.id);
    const inReview = service.getTicket(ticket.id);
    expect(inReview?.status).toBe('in_review');

    service.markResolved(ticket.id, { resolution: 'Updated revenue figures', resolvedBy: 'admin' });
    const resolved = service.getTicket(ticket.id);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolution).toBe('Updated revenue figures');
  });

  it('rejects tickets for invalid symbol format', () => {
    expect(() =>
      service.createCorrection({
        symbol: '', // empty symbol
        userId: 'user_1',
        description: 'Test',
      }),
    ).toThrow();
  });

  it('lists open tickets', () => {
    const s2 = new ResearchCorrectionService();
    s2.createCorrection({ symbol: 'INFY', userId: 'user_1', description: 'Test issue 1' });
    s2.createCorrection({ symbol: 'HDFC', userId: 'user_2', description: 'Test issue 2' });
    
    const open = s2.getOpenTickets();
    expect(open.length).toBe(2);
  });

  it('tracks corrections by symbol', () => {
    const s3 = new ResearchCorrectionService();
    s3.createCorrection({ symbol: 'RELIANCE', userId: 'user_1', description: 'Issue 1' });
    s3.createCorrection({ symbol: 'RELIANCE', userId: 'user_2', description: 'Issue 2' });
    
    const bySymbol = s3.getBySymbol('RELIANCE');
    expect(bySymbol.length).toBe(2);
  });

  it('returns empty array for unknown symbol', () => {
    expect(service.getBySymbol('UNKNOWN')).toEqual([]);
  });

  it('aggregates correction statistics', () => {
    const s4 = new ResearchCorrectionService();
    s4.createCorrection({ symbol: 'RELIANCE', userId: 'user_1', description: 'Issue' });
    
    const stats = s4.getStatistics();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.open).toBeGreaterThanOrEqual(1);
    expect(typeof stats.open).toBe('number');
  });
});
