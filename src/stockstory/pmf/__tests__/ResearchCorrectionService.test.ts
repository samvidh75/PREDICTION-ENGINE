import { describe, it, expect, beforeEach } from 'vitest';
import {
  reportCorrection,
  updateCorrectionStatus,
  getCorrection,
  getAllCorrections,
  getCorrectionsBySymbol,
  getCorrectionAnalytics,
  clearCorrections,
} from '../ResearchCorrectionService';

describe('ResearchCorrectionService', () => {
  beforeEach(() => {
    clearCorrections();
  });

  it('creates a correction ticket', () => {
    const ticket = reportCorrection({
      symbol: 'RELIANCE',
      component: 'thesis',
      issueType: 'OUTDATED_INFO',
      description: 'The PE ratio is outdated in the thesis',
      reporterId: 'user_1',
    });
    expect(ticket.id).toMatch(/^corr-/);
    expect(ticket.status).toBe('reported');
    expect(ticket.symbol).toBe('RELIANCE');
    expect(ticket.reporterId).toBe('user_1');
  });

  it('tracks lifecycle from reported to fixed', () => {
    const ticket = reportCorrection({
      symbol: 'TCS',
      component: 'financials',
      issueType: 'OUTDATED_INFO',
      description: 'Revenue figures are from last quarter',
      reporterId: 'user_2',
    });
    expect(ticket.status).toBe('reported');

    updateCorrectionStatus(ticket.id, 'in_review');
    const inReview = getCorrection(ticket.id);
    expect(inReview?.status).toBe('in_review');

    updateCorrectionStatus(ticket.id, 'fixed', 'Updated revenue figures');
    const resolved = getCorrection(ticket.id);
    expect(resolved?.status).toBe('fixed');
    expect(resolved?.resolution).toBe('Updated revenue figures');
  });

  it('accepts correction with empty symbol', () => {
    const ticket = reportCorrection({
      symbol: '',
      component: 'thesis',
      issueType: 'INACCURATE_DATA',
      description: 'Test',
      reporterId: 'user_1',
    });
    expect(ticket.symbol).toBe('');
    expect(ticket.status).toBe('reported');
  });

  it('lists all corrections', () => {
    reportCorrection({ symbol: 'INFY', component: 'thesis', issueType: 'INACCURATE_DATA', description: 'Test issue 1', reporterId: 'user_1' });
    reportCorrection({ symbol: 'HDFC', component: 'thesis', issueType: 'INACCURATE_DATA', description: 'Test issue 2', reporterId: 'user_2' });

    const all = getAllCorrections();
    expect(all.length).toBe(2);
  });

  it('tracks corrections by symbol', () => {
    reportCorrection({ symbol: 'RELIANCE', component: 'thesis', issueType: 'INACCURATE_DATA', description: 'Issue 1', reporterId: 'user_1' });
    reportCorrection({ symbol: 'RELIANCE', component: 'thesis', issueType: 'INACCURATE_DATA', description: 'Issue 2', reporterId: 'user_2' });

    const bySymbol = getCorrectionsBySymbol('RELIANCE');
    expect(bySymbol.length).toBe(2);
  });

  it('returns empty array for unknown symbol', () => {
    clearCorrections();
    expect(getCorrectionsBySymbol('UNKNOWN')).toEqual([]);
  });

  it('aggregates correction statistics', () => {
    reportCorrection({ symbol: 'RELIANCE', component: 'thesis', issueType: 'INACCURATE_DATA', description: 'Issue', reporterId: 'user_1' });

    const stats = getCorrectionAnalytics();
    expect(stats.totalReported).toBeGreaterThanOrEqual(1);
    expect(typeof stats.totalReported).toBe('number');
  });
});
