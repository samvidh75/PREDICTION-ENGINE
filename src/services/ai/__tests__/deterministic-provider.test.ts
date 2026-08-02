import { describe, it, expect } from 'vitest';
import { DeterministicResearchProvider } from '../DeterministicResearchProvider';
import type { StockData } from '../AIProvider';

const mockStock: StockData = {
  symbol: 'RELIANCE',
  name: 'Reliance Industries Ltd',
  price: 2850,
  change: 25,
  changePercent: 0.88,
  pe: 28,
  pb: 3.5,
  roe: 12,
  marketCap: '19,00,000 Cr',
  sector: 'Energy',
  industry: 'Oil & Gas',
  revenueGrowth: 15,
  profitMargin: 10,
  debtToEquity: 0.8,
  currentRatio: 1.2,
  rsi: 55,
  macd: 12,
  bollingerWidth: 85,
  high52w: 3200,
  low52w: 2400,
};

const provider = new DeterministicResearchProvider();

describe('DeterministicResearchProvider', () => {
  it('returns a valid StockAnalysis without any LLM', async () => {
    const result = await provider.analyzeStock(mockStock);
    expect(result.symbol).toBe('RELIANCE');
    expect(result.quality.score).toBeGreaterThanOrEqual(0);
    expect(result.quality.score).toBeLessThanOrEqual(100);
    expect(result.quality.reasoning).toBeTruthy();
    expect(result.quality.factors).toBeInstanceOf(Array);
    expect(result.valuation.score).toBeGreaterThanOrEqual(0);
    expect(result.growth.score).toBeGreaterThanOrEqual(0);
    expect(result.technicals.score).toBeGreaterThanOrEqual(0);
    expect(result.risk.score).toBeGreaterThanOrEqual(0);
  });

  it('generates thesis without LLM', async () => {
    const analysis = await provider.analyzeStock(mockStock);
    const thesis = await provider.generateThesis(mockStock, analysis);
    expect(thesis.bullCase).toBeTruthy();
    expect(thesis.bearCase).toBeTruthy();
    expect(thesis.investmentHorizon).toBeTruthy();
    expect(thesis.keyRisks).toBeInstanceOf(Array);
    expect(thesis.catalysts).toBeInstanceOf(Array);
  });

  it('generates recommendation without LLM', async () => {
    const analysis = await provider.analyzeStock(mockStock);
    const thesis = await provider.generateThesis(mockStock, analysis);
    const rec = await provider.generateRecommendation(mockStock, analysis, thesis);
    expect(['BUY', 'HOLD', 'SELL']).toContain(rec.action);
    expect(rec.rating).toBeGreaterThanOrEqual(0);
    expect(rec.conviction).toBeGreaterThanOrEqual(0);
    expect(rec.riskReward).toMatch(/favorable|neutral|unfavorable/);
  });

  it('compares stocks without LLM', async () => {
    const result = await provider.compareStocks([mockStock]);
    expect(result.ranking).toBeInstanceOf(Array);
    expect(result.winner).toBeTruthy();
    expect(result.summary).toBeTruthy();
  });

  it('generates bull/bear case without LLM', async () => {
    const analysis = await provider.analyzeStock(mockStock);
    const result = await provider.generateBullBearCase(mockStock, analysis);
    expect(result.bullCase).toBeTruthy();
    expect(result.bearCase).toBeTruthy();
  });

  it('generates risk triggers without LLM', async () => {
    const analysis = await provider.analyzeStock(mockStock);
    const triggers = await provider.generateRiskTriggers(mockStock, analysis);
    expect(triggers).toBeInstanceOf(Array);
  });

  it('generates peer comparison without LLM', async () => {
    const analysis = await provider.analyzeStock(mockStock);
    const comparison = await provider.generatePeerComparison(mockStock, [mockStock]);
    expect(comparison).toBeTruthy();
  });

  it('generates valuation explanation without LLM', async () => {
    const analysis = await provider.analyzeStock(mockStock);
    const explanation = await provider.generateValuationExplanation(mockStock, analysis);
    expect(explanation).toContain('RELIANCE');
    expect(explanation).toContain('28'); // P/E
  });
});
