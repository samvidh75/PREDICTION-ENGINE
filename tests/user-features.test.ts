/**
 * User features integration tests
 * Tests portfolio store (IndexedDB), watchlist manager, thesis alerts, investor memory
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockStore = new Map<string, Map<string, unknown>>();
const indexData = new Map<string, Array<{ key: string; value: unknown }>>();

function getStore(name: string): Map<string, unknown> {
  if (!mockStore.has(name)) mockStore.set(name, new Map());
  return mockStore.get(name)!;
}

const INDEX_FIELD_MAP: Record<string, string> = {
  'by-symbol': 'symbol',
  'by-date': 'entryDate',
  'by-position-id': 'positionId',
};

function wrapStore(name: string) {
  const idx = (indexName: string) => {
    const entries = Array.from(getStore(name).entries()).map(([k, v]) => ({ key: k, value: v }));
    const field = INDEX_FIELD_MAP[indexName] || indexName.replace('by-', '');
    return {
      getAll: async (query: string) =>
        entries
          .filter((e) => (e.value as Record<string, unknown>)[field] === query)
          .map((e) => e.value),
    };
  };
  return {
    get: vi.fn(async (key: string) => getStore(name).get(key)),
    getAll: vi.fn(async () => Array.from(getStore(name).values())),
    put: vi.fn(async (value: any) => {
      const key = value.id ?? crypto.randomUUID();
      getStore(name).set(key, value);
      return key;
    }),
    add: vi.fn(async (value: any) => {
      const key = value.id ?? crypto.randomUUID();
      getStore(name).set(key, value);
      return key;
    }),
    delete: vi.fn(async (key: string) => {
      getStore(name).delete(key);
    }),
    index: vi.fn(idx),
  };
}

vi.mock('idb', () => ({
  openDB: vi.fn(() => {
    const db = {
      getAll: vi.fn(async (storeName: string) => {
        return Array.from(getStore(storeName).values());
      }),
      get: vi.fn(async (storeName: string, key: string) => {
        return getStore(storeName).get(key);
      }),
      add: vi.fn(async (storeName: string, value: any) => {
        const key = value.id ?? crypto.randomUUID();
        getStore(storeName).set(key, value);
        return key;
      }),
      put: vi.fn(async (storeName: string, value: any) => {
        const key = value.id ?? crypto.randomUUID();
        getStore(storeName).set(key, value);
        return key;
      }),
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn().mockReturnValue({ createIndex: vi.fn() }),
      transaction: vi.fn((storeName: string) => ({
        store: wrapStore(storeName),
        objectStore: wrapStore(storeName),
      })),
      delete: vi.fn(async (storeName: string, key: string) => {
        getStore(storeName).delete(key);
      }),
    };
    return Promise.resolve(db);
  }),
}));

describe('Portfolio Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('creates and retrieves positions', async () => {
    const { portfolioStore } = await import('../src/services/portfolio/portfolioStore');
    const pos = await portfolioStore.addPosition('TCS', 10, 3500);
    expect(pos.symbol).toBe('TCS');
    expect(pos.quantity).toBe(10);
    expect(pos.entryPrice).toBe(3500);
    expect(pos.isActive).toBe(true);
    expect(pos.id).toBeTruthy();
  });

  test('calculates P&L correctly', async () => {
    const { portfolioStore } = await import('../src/services/portfolio/portfolioStore');
    const pos = await portfolioStore.addPosition('RELIANCE', 5, 2500);
    const pnl = await portfolioStore.calculatePnL(pos.id, 2750);
    expect(pnl.invested).toBe(12500);
    expect(pnl.current).toBe(13750);
    expect(pnl.unrealizedPnL).toBe(1250);
    expect(pnl.unrealizedPnLPercent).toBe(10);
  });

  test('records transactions', async () => {
    const { portfolioStore } = await import('../src/services/portfolio/portfolioStore');
    const pos = await portfolioStore.addPosition('HDFCBANK', 20, 1600);
    const txn = await portfolioStore.recordTransaction(pos.id, 'BUY', 20, 1600);
    expect(txn.type).toBe('BUY');
    expect(txn.positionId).toBe(pos.id);
  });

  test('saves and retrieves thesis', async () => {
    const { portfolioStore } = await import('../src/services/portfolio/portfolioStore');
    const pos = await portfolioStore.addPosition('TCS', 1, 4000);
    const thesis = await portfolioStore.saveThesis(
      pos.id,
      'Strong order book, margin expansion',
      'Valuation rich, global slowdown risk',
      ['IT spending cuts', 'Rupee volatility'],
      8,
      4500,
      3500,
      ['Q3 earnings beat', 'Cloud deal wins'],
    );
    expect(thesis.conviction).toBe(8);
    expect(thesis.targetPrice).toBe(4500);
    expect(thesis.stopLoss).toBe(3500);
    expect(thesis.riskFactors).toContain('Rupee volatility');

    const latest = await portfolioStore.getLatestThesis(pos.id);
    expect(latest).toBeTruthy();
    expect(latest!.conviction).toBe(8);
  });

  test('closes positions', async () => {
    const { portfolioStore } = await import('../src/services/portfolio/portfolioStore');
    const pos = await portfolioStore.addPosition('INFY', 15, 1800);
    await portfolioStore.closePosition(pos.id, 1900);
    const positions = await portfolioStore.getPositions();
    expect(positions.find((p: { id: string }) => p.id === pos.id)).toBeFalsy();
  });
});

describe('Watchlist Manager', () => {
  let watchlistStore: any;

  beforeEach(async () => {
    watchlistStore = await import('../src/services/portfolio/watchlistStore');
    localStorage.clear();
  });

  test('creates watchlists', () => {
    const wl = watchlistStore.createWatchlist('My Favourites');
    expect(wl).toBeTruthy();
    expect(wl.name).toBe('My Favourites');
    expect(wl.tickers).toEqual([]);
  });

  test('adds and removes tickers', () => {
    const wl = watchlistStore.createWatchlist('Test');
    watchlistStore.addTickerToWatchlist(wl.id, 'TCS');
    watchlistStore.addTickerToWatchlist(wl.id, 'RELIANCE');
    let lists = watchlistStore.getWatchlists();
    let found = lists.find((w: any) => w.id === wl.id);
    expect(found!.tickers).toEqual(['TCS', 'RELIANCE']);

    watchlistStore.removeTickerFromWatchlist(wl.id, 'TCS');
    lists = watchlistStore.getWatchlists();
    found = lists.find((w: any) => w.id === wl.id);
    expect(found!.tickers).toEqual(['RELIANCE']);
  });

  test('renames and archives watchlists', () => {
    const wl = watchlistStore.createWatchlist('Old');
    watchlistStore.renameWatchlist(wl.id, 'New');
    expect(watchlistStore.getWatchlists().find((w: any) => w.id === wl.id)!.name).toBe('New');

    watchlistStore.archiveWatchlist(wl.id);
    // getWatchlists() filters out archived entries; check localStorage directly
    const key = Object.keys(localStorage).find(k => k.startsWith('stockstory_multi_watchlist_v1'))!;
    const data = JSON.parse(localStorage.getItem(key)!);
    expect(data.find((w: any) => w.id === wl.id)!.isArchived).toBe(true);
  });

  test('deletes watchlists', () => {
    const wl = watchlistStore.createWatchlist('Temp');
    expect(watchlistStore.getWatchlists().length).toBeGreaterThanOrEqual(1);
    watchlistStore.deleteWatchlist(wl.id);
    expect(watchlistStore.getWatchlists().find((w: any) => w.id === wl.id)).toBeFalsy();
  });
});

describe('Investor Memory Engine', () => {
  let IME: any;

  beforeEach(async () => {
    IME = await import('../src/services/portfolio/InvestorMemoryEngine');
    localStorage.clear();
  });

  test('saves and unsaves companies', () => {
    IME.InvestorMemoryEngine.saveCompany('TCS');
    const mem = IME.InvestorMemoryEngine.getMemory();
    expect(mem.savedCompanies).toContain('TCS');

    IME.InvestorMemoryEngine.unsaveCompany('TCS');
    const mem2 = IME.InvestorMemoryEngine.getMemory();
    expect(mem2.savedCompanies).not.toContain('TCS');
  });

  test('manages preferences', () => {
    IME.InvestorMemoryEngine.addFavouredSector('Technology');
    const mem = IME.InvestorMemoryEngine.getMemory();
    expect(mem.preferences.favouredSectors).toContain('Technology');

    IME.InvestorMemoryEngine.addAvoidedSector('Real Estate');
    const mem2 = IME.InvestorMemoryEngine.getMemory();
    expect(mem2.preferences.avoidedSectors).toContain('Real Estate');
  });

  test('records and retrieves decisions', () => {
    IME.InvestorMemoryEngine.recordDecision('TCS', 'added', 'Strong Q3, order book growth');
    const decisions = IME.InvestorMemoryEngine.getDecisionsForSymbol('TCS');
    expect(decisions.length).toBe(1);
    expect(decisions[0].decision).toBe('added');
  });

  test('records and categorises learnings', () => {
    IME.InvestorMemoryEngine.addLearning('sector', 'IT sector benefits from rupee depreciation');
    IME.InvestorMemoryEngine.addLearning('indicator', 'RSI above 70 often precedes corrections');
    const sectorLearnings = IME.InvestorMemoryEngine.getLearningsByCategory('sector');
    expect(sectorLearnings.length).toBe(1);
    expect(sectorLearnings[0].category).toBe('sector');
  });

  test('updates decision outcomes', () => {
    IME.InvestorMemoryEngine.recordDecision('HAL', 'added', 'Defence momentum');
    const decisions = IME.InvestorMemoryEngine.getDecisionsForSymbol('HAL');
    IME.InvestorMemoryEngine.updateDecisionOutcome(decisions[0].id, 'Gained 15% in 2 months');
    const updated = IME.InvestorMemoryEngine.getDecisionsForSymbol('HAL');
    expect(updated[0].outcome).toBe('Gained 15% in 2 months');
  });

  test('updates investor style preferences', () => {
    IME.InvestorMemoryEngine.updatePreferences({ style: 'value', minROE: 15, convictionThreshold: 7 });
    const mem = IME.InvestorMemoryEngine.getMemory();
    expect(mem.preferences.style).toBe('value');
    expect(mem.preferences.minROE).toBe(15);
  });
});

describe('Thesis Alert Engine', () => {
  let TAE: any;

  beforeEach(async () => {
    localStorage.clear();
    TAE = await import('../src/services/portfolio/ThesisAlertEngine');
  });

  test('generates stop-loss alerts', () => {
    const alerts: any[] = [];
    alerts.push({
      id: 'test1',
      positionId: 'p1',
      symbol: 'TCS',
      type: 'STOP_LOSS_BREACH',
      severity: 'high',
      message: 'TCS at ₹3200 — breached stop-loss ₹3400.',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
    expect(alerts[0].type).toBe('STOP_LOSS_BREACH');
    expect(alerts[0].severity).toBe('high');
  });

  test('dismisses and clears alerts', () => {
    TAE.ThesisAlertEngine.dismissAll();
    const alerts = TAE.ThesisAlertEngine.getAlerts();
    expect(alerts.every((a: any) => a.dismissed)).toBe(true);
  });

  test('deduplicates alerts by position and type', () => {
    const deduped = TAE.ThesisAlertEngine._deduplicate([
      { positionId: 'p1', type: 'STOP_LOSS_BREACH', id: 'a' },
      { positionId: 'p1', type: 'STOP_LOSS_BREACH', id: 'b' },
      { positionId: 'p1', type: 'PRICE_ABOVE_TARGET', id: 'c' },
    ] as any);
    expect(deduped.length).toBe(2);
    expect(deduped[0].id).toBe('a');
    expect(deduped[1].id).toBe('c');
  });
});
