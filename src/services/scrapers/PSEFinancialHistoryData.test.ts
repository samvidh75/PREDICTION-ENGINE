import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

// We test the file directly rather than the cached loader, so the module's
// internal cache never short-circuits between tests. The loader reads from
// resolve(process.cwd(), 'data/pse-financial-history.json') — the SAME path
// this test writes fixtures to, since the loader has no injectable path
// override. This used to just rmSync the file after every test, which
// permanently destroyed the real, committed, scraped production data file
// on every `vitest run` (discovered after it vanished three times in one
// session with no other explanation). Back up the real content once before
// any test runs and restore it after the whole suite, rather than deleting.
const DATA_FILE = resolve(process.cwd(), 'data/pse-financial-history.json');
const DATA_DIR = resolve(process.cwd(), 'data');

let originalContent: string | null = null;

function writeFake(data: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8');
}

function restoreOriginal() {
  if (originalContent !== null) {
    writeFileSync(DATA_FILE, originalContent, 'utf-8');
  } else {
    rmSync(DATA_FILE, { force: true });
  }
}

describe('PSEFinancialHistoryData loader', () => {
  beforeAll(() => {
    originalContent = existsSync(DATA_FILE) ? readFileSync(DATA_FILE, 'utf-8') : null;
  });

  afterEach(() => {
    restoreOriginal();
    // Clear the module cache so each import picks up the on-disk file.
    vi.resetModules();
  });

  afterAll(() => {
    restoreOriginal();
  });

  it('returns a real series when the symbol has >=2 quarters', async () => {
    writeFake({
      generatedAt: '2026-01-01T00:00:00Z',
      source: 'edge.pse.com.ph',
      results: {
        ABA: {
          symbol: 'ABA',
          series: [
            { period: 'Jun 30, 2024', asOfPeriod: 'Jun 30, 2024', revenue: 121279153, netIncome: 85119978, sourceUrl: 'https://edge.pse.com.ph/fake1' },
            { period: 'Sep 30, 2024', asOfPeriod: 'Sep 30, 2024', revenue: 6473138, netIncome: 32333476, sourceUrl: 'https://edge.pse.com.ph/fake2' },
            { period: 'Dec 31, 2024', asOfPeriod: 'Dec 31, 2024', revenue: 98000000, netIncome: 52000000, sourceUrl: 'https://edge.pse.com.ph/fake3' },
          ],
        },
      },
    });

    const { loadPseFinancialHistory, realFinancialQuarterCount } = await import('./PSEFinancialHistoryData.js');
    const rec = loadPseFinancialHistory('ABA');
    expect(rec).not.toBeNull();
    expect(rec!.symbol).toBe('ABA');
    expect(rec!.series).toHaveLength(3);
    expect(rec!.series[0].revenue).toBe(121279153);

    expect(realFinancialQuarterCount('ABA')).toBe(3);
  });

  it('is case-insensitive on the symbol', async () => {
    writeFake({ results: { BDO: { symbol: 'BDO', series: fakeSeries(3) } } });
    const { loadPseFinancialHistory } = await import('./PSEFinancialHistoryData.js');
    expect(loadPseFinancialHistory('bdo')).not.toBeNull();
    expect(loadPseFinancialHistory('BDO')).not.toBeNull();
  });

  it('returns null when the symbol has no entry', async () => {
    writeFake({ results: { ABA: { symbol: 'ABA', series: fakeSeries(3) } } });
    const { loadPseFinancialHistory } = await import('./PSEFinancialHistoryData.js');
    expect(loadPseFinancialHistory('ZZZ')).toBeNull();
  });

  it('returns null when the symbol only has a single quarter', async () => {
    writeFake({ results: { AAA: { symbol: 'AAA', series: fakeSeries(1) } } });
    const { loadPseFinancialHistory } = await import('./PSEFinancialHistoryData.js');
    expect(loadPseFinancialHistory('AAA')).toBeNull();
  });

  it('returns null (falls back to synthetic) when the file does not exist', async () => {
    // Explicitly absent for this one test only — afterEach restores the
    // real file afterward, it doesn't just leave it deleted.
    rmSync(DATA_FILE, { force: true });
    const { loadPseFinancialHistory } = await import('./PSEFinancialHistoryData.js');
    expect(loadPseFinancialHistory('ABA')).toBeNull();
  });
});

function fakeSeries(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    period: `Q${i + 1}`,
    asOfPeriod: `Q${i + 1}`,
    revenue: 1000000 * (i + 1),
    netIncome: 500000 * (i + 1),
    totalAssets: null,
    totalEquity: null,
    totalLiabilities: null,
    eps: null,
    sourceUrl: 'https://edge.pse.com.ph/fake',
  }));
}
