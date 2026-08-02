/**
 * Test-only evaluation fixtures for the intelligence engine.
 * These are synthetic test data — NOT real companies.
 * Do not use in production code.
 * Do not represent as real companies.
 */

/** A high-quality compounder with strong fundamentals */
export const FIXTURE_HIGH_QUALITY_COMPOUNDER = {
  symbol: 'TESTQUALITY',
  name: 'Test Quality Corp (Test-Only)',
  sector: 'Technology',
  financials: {
    revenue: 50000,
    netIncome: 8500,
    operatingMargin: 28,
    debtToEquity: 0.15,
    roe: 22,
    roa: 14,
    pe: 28,
    pb: 5.5,
    dividendYield: 1.2,
  },
  technicals: { rsi: 58, macd: 2.1, sma20: 2450, sma50: 2380, atr: 45, adx: 28 },
  earnings: [
    { revenue: 12500, netIncome: 2150, eps: 18.5, quarter: 'Q4', year: 2025, date: '2025-03-31' },
    { revenue: 12000, netIncome: 2050, eps: 17.6, quarter: 'Q3', year: 2025, date: '2024-12-31' },
  ],
  scores: { overall: 82, quality: 88, growth: 75, value: 45, momentum: 70, risk: 25, sector: 80, earningsScore: 85, sentimentScore: 60 },
  drivers: ['Strong ROE', 'Low debt', 'Consistent earnings growth', 'Industry leader'],
  risks: ['Premium valuation', 'Concentration risk'],
};

/** An expensive weak-growth company */
export const FIXTURE_EXPENSIVE_WEAK_GROWTH = {
  symbol: 'TESTEXPENSIVE',
  name: 'Test Expensive Corp (Test-Only)',
  sector: 'Consumer',
  financials: {
    revenue: 10000,
    netIncome: 1200,
    operatingMargin: 15,
    debtToEquity: 0.8,
    roe: 8,
    roa: 4,
    pe: 55,
    pb: 8.5,
    dividendYield: 0.3,
  },
  technicals: { rsi: 72, macd: -0.5, sma20: 890, sma50: 920, atr: 22, adx: 16 },
  earnings: [{ revenue: 2500, netIncome: 290, eps: 3.2, quarter: 'Q4', year: 2025, date: '2025-03-31' }],
  scores: { overall: 35, quality: 30, growth: 15, value: 10, momentum: 25, risk: 65, sector: 40, earningsScore: 20, sentimentScore: 35 },
  drivers: [],
  risks: ['High valuation', 'Low growth', 'Declining margins', 'Elevated debt'],
};

/** A high-debt company */
export const FIXTURE_HIGH_DEBT = {
  symbol: 'TESTDEBT',
  name: 'Test Debt Corp (Test-Only)',
  sector: 'Industrials',
  financials: {
    revenue: 20000,
    netIncome: 500,
    operatingMargin: 8,
    debtToEquity: 3.2,
    roe: 5,
    roa: 1.5,
    pe: 20,
    pb: 1.2,
    dividendYield: 0,
  },
  technicals: { rsi: 35, macd: -3.1, sma20: 180, sma50: 210, atr: 12, adx: 35 },
  earnings: [{ revenue: 5000, netIncome: 100, eps: 0.8, quarter: 'Q4', year: 2025, date: '2025-03-31' }],
  scores: { overall: 28, quality: 20, growth: 30, value: 55, momentum: 15, risk: 85, sector: 30, earningsScore: 25, sentimentScore: 20 },
  drivers: ['Low valuation'],
  risks: ['Extremely high debt', 'Low profitability', 'Weak momentum', 'High risk score'],
};

/** A turnaround case with improving momentum */
export const FIXTURE_TURNAROUND = {
  symbol: 'TESTTURN',
  name: 'Test Turnaround Corp (Test-Only)',
  sector: 'Retail',
  financials: {
    revenue: 8000,
    netIncome: -200,
    operatingMargin: -2,
    debtToEquity: 1.5,
    roe: -3,
    roa: -1,
    pe: -25,
    pb: 0.8,
    dividendYield: 0,
  },
  technicals: { rsi: 65, macd: 1.8, sma20: 320, sma50: 290, atr: 18, adx: 42 },
  earnings: [
    { revenue: 2100, netIncome: -80, eps: -0.6, quarter: 'Q4', year: 2025, date: '2025-03-31' },
    { revenue: 1900, netIncome: -150, eps: -1.2, quarter: 'Q3', year: 2025, date: '2024-12-31' },
  ],
  scores: { overall: 45, quality: 25, growth: 60, value: 70, momentum: 75, risk: 60, sector: 35, earningsScore: 35, sentimentScore: 55 },
  drivers: ['Improving momentum', 'Low valuation', 'Losses narrowing'],
  risks: ['Still unprofitable', 'Elevated debt', 'Sector headwinds'],
};

/** A dividend yield trap with weak fundamentals */
export const FIXTURE_DIVIDEND_TRAP = {
  symbol: 'TESTDIV',
  name: 'Test Dividend Corp (Test-Only)',
  sector: 'Energy',
  financials: {
    revenue: 15000,
    netIncome: 800,
    operatingMargin: 10,
    debtToEquity: 1.8,
    roe: 6,
    roa: 2,
    pe: 15,
    pb: 1.0,
    dividendYield: 6.5,
  },
  technicals: { rsi: 30, macd: -4.5, sma20: 450, sma50: 520, atr: 25, adx: 38 },
  earnings: [{ revenue: 3700, netIncome: 180, eps: 1.5, quarter: 'Q4', year: 2025, date: '2025-03-31' }],
  scores: { overall: 32, quality: 30, growth: 10, value: 65, momentum: 10, risk: 70, sector: 35, earningsScore: 25, sentimentScore: 25 },
  drivers: ['High dividend yield', 'Low valuation'],
  risks: ['Unsustainable dividend', 'Declining earnings', 'High debt', 'Weak momentum'],
};

/** A momentum leader with high volatility */
export const FIXTURE_MOMENTUM_VOLATILITY = {
  symbol: 'TESTMOM',
  name: 'Test Momentum Corp (Test-Only)',
  sector: 'Technology',
  financials: {
    revenue: 30000,
    netIncome: 4500,
    operatingMargin: 22,
    debtToEquity: 0.4,
    roe: 18,
    roa: 10,
    pe: 40,
    pb: 7.0,
    dividendYield: 0.1,
  },
  technicals: { rsi: 78, macd: 8.2, sma20: 5200, sma50: 4800, atr: 180, adx: 55 },
  earnings: [
    { revenue: 8000, netIncome: 1300, eps: 11.0, quarter: 'Q4', year: 2025, date: '2025-03-31' },
    { revenue: 7500, netIncome: 1100, eps: 9.5, quarter: 'Q3', year: 2025, date: '2024-12-31' },
  ],
  scores: { overall: 68, quality: 65, growth: 85, value: 25, momentum: 90, risk: 45, sector: 75, earningsScore: 80, sentimentScore: 70 },
  drivers: ['Strong momentum', 'High growth', 'Good quality'],
  risks: ['Expensive valuation', 'High volatility', 'Momentum-dependent'],
};

/** A missing-data company with very little info */
export const FIXTURE_MISSING_DATA = {
  symbol: 'TESTMISS',
  name: 'Test Missing Data Corp (Test-Only)',
  sector: 'Unknown',
  financials: {},
  technicals: {},
  earnings: [],
  scores: { overall: 0, quality: 0, growth: 0, value: 0, momentum: 0, risk: 0, sector: 0, earningsScore: 0, sentimentScore: 0 },
  drivers: [],
  risks: [],
};

/** A negative-news company */
export const FIXTURE_NEGATIVE_NEWS = {
  symbol: 'TESTNEG',
  name: 'Test Negative Corp (Test-Only)',
  sector: 'Financials',
  financials: {
    revenue: 12000,
    netIncome: -500,
    operatingMargin: -5,
    debtToEquity: 2.5,
    roe: -4,
    roa: -2,
    pe: -30,
    pb: 0.5,
    dividendYield: 0,
  },
  technicals: { rsi: 28, macd: -6.5, sma20: 120, sma50: 160, atr: 15, adx: 45 },
  earnings: [{ revenue: 2800, netIncome: -200, eps: -1.8, quarter: 'Q4', year: 2025, date: '2025-03-31' }],
  scores: { overall: 18, quality: 15, growth: 5, value: 20, momentum: 8, risk: 90, sector: 20, earningsScore: 10, sentimentScore: 12 },
  drivers: [],
  risks: ['Loss-making', 'High debt', 'Negative momentum', 'Regulatory concerns'],
};

/** A strong-earnings company with positive surprise */
export const FIXTURE_STRONG_EARNINGS = {
  symbol: 'TESTEARN',
  name: 'Test Earnings Corp (Test-Only)',
  sector: 'Consumer',
  financials: {
    revenue: 40000,
    netIncome: 7200,
    operatingMargin: 25,
    debtToEquity: 0.2,
    roe: 20,
    roa: 12,
    pe: 25,
    pb: 4.5,
    dividendYield: 0.8,
  },
  technicals: { rsi: 62, macd: 3.5, sma20: 3200, sma50: 3100, atr: 55, adx: 30 },
  earnings: [
    { revenue: 11000, netIncome: 2200, eps: 19.0, quarter: 'Q4', year: 2025, date: '2025-03-31' },
    { revenue: 10000, netIncome: 1800, eps: 15.5, quarter: 'Q3', year: 2025, date: '2024-12-31' },
    { revenue: 9500, netIncome: 1600, eps: 13.8, quarter: 'Q2', year: 2025, date: '2024-09-30' },
  ],
  scores: { overall: 78, quality: 80, growth: 72, value: 55, momentum: 68, risk: 30, sector: 72, earningsScore: 88, sentimentScore: 65 },
  drivers: ['Strong earnings growth', 'High margins', 'Low debt', 'Consistent performance'],
  risks: ['Consumer sector cyclicality', 'Moderate valuation'],
};

/** A peer comparison case with multiple peers */
export const FIXTURE_PEER_COMPARISON = {
  symbol: 'TESTPEER',
  name: 'Test Peer Corp (Test-Only)',
  sector: 'Technology',
  peers: [
    { symbol: 'PEERA', name: 'Peer A Corp', pe: 30, pb: 6.0 },
    { symbol: 'PEERB', name: 'Peer B Corp', pe: 22, pb: 4.0 },
    { symbol: 'PEERC', name: 'Peer C Corp', pe: 35, pb: 7.5 },
  ],
  financials: {
    revenue: 25000,
    netIncome: 4000,
    operatingMargin: 24,
    debtToEquity: 0.3,
    roe: 19,
    roa: 11,
    pe: 28,
    pb: 5.0,
    dividendYield: 0.5,
  },
  technicals: { rsi: 55, macd: 1.5, sma20: 1800, sma50: 1750, atr: 40, adx: 25 },
  earnings: [{ revenue: 6500, netIncome: 1100, eps: 9.5, quarter: 'Q4', year: 2025, date: '2025-03-31' }],
  scores: { overall: 72, quality: 75, growth: 65, value: 60, momentum: 55, risk: 35, sector: 70, earningsScore: 75, sentimentScore: 60 },
  drivers: ['Good quality', 'Reasonable valuation', 'Low debt'],
  risks: ['Moderate growth', 'Sector competition'],
};

export const ALL_FIXTURES = [
  FIXTURE_HIGH_QUALITY_COMPOUNDER,
  FIXTURE_EXPENSIVE_WEAK_GROWTH,
  FIXTURE_HIGH_DEBT,
  FIXTURE_TURNAROUND,
  FIXTURE_DIVIDEND_TRAP,
  FIXTURE_MOMENTUM_VOLATILITY,
  FIXTURE_MISSING_DATA,
  FIXTURE_NEGATIVE_NEWS,
  FIXTURE_STRONG_EARNINGS,
  FIXTURE_PEER_COMPARISON,
] as const;
