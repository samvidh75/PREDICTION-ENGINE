/**
 * UpstoxFundamentalsProvider — Indian equity fundamentals via Upstox Fundamentals API.
 *
 * TRACK-8E: Tier 1 FinancialProvider — primary source for Indian equity fundamentals.
 *   Free with your Upstox account. Guaranteed Indian coverage. Already authenticated.
 *
 * Endpoints used:
 *   GET /v2/fundamentals/{isin}/key-ratios        — P/E, P/B, ROE, ROA, ROCE, EV/EBITDA
 *   GET /v2/fundamentals/{isin}/balance-sheet      — Total assets, liabilities, equity
 *
 * Auth: Uses existing Upstox access token (same OAuth flow as portfolio reading).
 * ISIN resolution: MasterCompanyRegistry (symbol → ISIN lookup).
 *
 * IMPORTANT: This provider requires an active Upstox access token. It does NOT
 * use API keys — it reuses the user's Upstox OAuth session. If the user hasn't
 * connected Upstox, this provider will fail gracefully and the coordinator will
 * fall through to Finnhub/IndianAPI/Yahoo.
 */

import { FinancialProvider, FinancialData } from './FinancialProvider';
import { RetryPolicy } from './RetryPolicy';
import { MasterCompanyRegistry } from '../data/MasterCompanyRegistry';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };
const API_BASE = 'https://api.upstox.com/v2/fundamentals';

/** Access token provider — injected at construction so it's call-site agnostic */
export type UpstoxTokenProvider = () => string | null;

export class UpstoxFundamentalsProvider implements FinancialProvider {
  private getToken: UpstoxTokenProvider;

  /**
   * @param getToken — function that returns the current Upstox access token, or null if unavailable.
   *   In browser: reads from localStorage/Firebase
   *   In server: reads from request context or DB
   */
  constructor(getToken: UpstoxTokenProvider) {
    this.getToken = getToken;
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    const token = this.getToken();
    if (!token) {
      throw new Error('UpstoxFundamentals: no access token — user must connect Upstox');
    }

    // Resolve ISIN from symbol
    const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
    const registry = MasterCompanyRegistry.getInstance();
    const entry = registry.lookup(clean);
    const isin = entry?.isin;

    if (!isin) {
      throw new Error(`UpstoxFundamentals: no ISIN found for ${clean} in MasterCompanyRegistry`);
    }

    // Fetch key ratios + balance sheet in parallel
    const [ratios, balanceSheet] = await Promise.allSettled([
      this.fetchKeyRatios(isin, token),
      this.fetchBalanceSheet(isin, token),
    ]);

    const ratioData = ratios.status === 'fulfilled' ? ratios.value : null;
    const bsData = balanceSheet.status === 'fulfilled' ? balanceSheet.value : null;

    // ── Parse ratios ──────────────────────────────────────
    const parseRatioValue = (name: string, raw: string | undefined): number | undefined => {
      if (!raw || raw === 'N/A') return undefined;
      // Strip % suffix if present
      const cleaned = raw.replace(/%$/, '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return undefined;
      // Ratios like ROE, ROA, ROCE come as percentages (e.g., "8.94%")
      if (raw.includes('%')) return num / 100;
      return num;
    };

    const ratioMap = new Map<string, { company: number | undefined; sector: number | undefined }>();
    if (ratioData?.data && Array.isArray(ratioData.data)) {
      for (const item of ratioData.data) {
        ratioMap.set(item.name, {
          company: parseRatioValue(item.name, item.company_value),
          sector: parseRatioValue(item.name, item.sector_value),
        });
      }
    }

    // ── Parse balance sheet ───────────────────────────────
    const latestBs = bsData?.data?.history?.[0];

    // ── Build FinancialData response ──────────────────────
    const n = (val: any): number | undefined => {
      if (val === null || val === undefined) return undefined;
      const v = Number(val);
      return isNaN(v) ? undefined : v;
    };

    const pe = ratioMap.get('P/E')?.company ?? ratioMap.get('P/E ratio')?.company;
    const pb = ratioMap.get('P/B')?.company ?? ratioMap.get('P/B ratio')?.company;
    const roe = ratioMap.get('ROE')?.company;
    const roa = ratioMap.get('ROA')?.company;
    const roce = ratioMap.get('ROCE')?.company;
    const evEbitda = ratioMap.get('EV/EBITDA')?.company;

    // Balance sheet gives us total_asset and total_liability in crores
    const totalAssetsCrore = n(latestBs?.total_asset);
    const totalLiabilitiesCrore = n(latestBs?.total_liability);
    const totalAssets = totalAssetsCrore ? totalAssetsCrore * 10_000_000 : undefined; // crore → INR
    const totalLiabilities = totalLiabilitiesCrore ? totalLiabilitiesCrore * 10_000_000 : undefined;
    // Derive equity = total assets - total liabilities
    const totalEquity = (totalAssets !== undefined && totalLiabilities !== undefined)
      ? totalAssets - totalLiabilities
      : undefined;

    // Derive debtToEquity from balance sheet (if we have both)
    const debtToEquity = (totalLiabilities !== undefined && totalLiabilities > 0 && totalEquity !== undefined && totalEquity > 0)
      ? totalLiabilities / totalEquity
      : undefined;

    return {
      symbol: clean,
      periodEnd: latestBs?.period
        ? this.parsePeriod(latestBs.period)
        : new Date().toISOString().split('T')[0],

      // ── Valuation ──────────────────────────────────────
      marketCap: undefined,
      peRatio: pe,
      pbRatio: pb,
      evEbitda: evEbitda,

      // ── Profitability / Quality ────────────────────────
      roe,
      roic: roce,
      roa,

      // ── Stability ──────────────────────────────────────
      debtToEquity,
      totalAssets,
      totalLiabilities,
      totalEquity,

      // ── Raw data for diagnostics ───────────────────────
      _raw: {
        source: 'Upstox Fundamentals API (v2)',
        isin,
        keyRatios: ratioData?.data ?? null,
        balanceSheet: bsData?.data?.history?.[0] ?? null,
        ratioMap: Object.fromEntries(ratioMap),
      },
    };
  }

  // ── API helpers ─────────────────────────────────────────

  private async fetchKeyRatios(isin: string, token: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const url = `${API_BASE}/${isin}/key-ratios`;
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (resp.status === 401) throw new Error('UpstoxFundamentals: token expired (401)');
      if (resp.status === 404) throw new Error(`UpstoxFundamentals: no data for ISIN ${isin} (404)`);
      if (resp.status === 429) throw new Error('UpstoxFundamentals: rate limited (429)');
      if (!resp.ok) throw new Error(`UpstoxFundamentals HTTP ${resp.status}: ${resp.statusText}`);
      return resp.json();
    }, RETRY_OPTS);
  }

  private async fetchBalanceSheet(isin: string, token: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const url = `${API_BASE}/${isin}/balance-sheet?type=consolidated`;
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (resp.status === 401) throw new Error('UpstoxFundamentals: token expired (401)');
      if (resp.status === 404) throw new Error(`UpstoxFundamentals: no balance sheet for ISIN ${isin} (404)`);
      if (resp.status === 429) throw new Error('UpstoxFundamentals: rate limited (429)');
      if (!resp.ok) throw new Error(`UpstoxFundamentals HTTP ${resp.status}: ${resp.statusText}`);
      return resp.json();
    }, RETRY_OPTS);
  }

  /** Convert "Mar 2025" → "2025-03-31" (approximate period end) */
  private parsePeriod(period: string): string {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const match = period.match(/^([A-Z][a-z]{2})\s+(\d{4})$/);
    if (match) {
      const monthCode = months[match[1]] ?? '03';
      const year = match[2];
      return `${year}-${monthCode}-31`;
    }
    return new Date().toISOString().split('T')[0];
  }
}
