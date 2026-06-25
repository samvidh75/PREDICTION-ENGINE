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
 * fall through to IndianAPI/Yahoo.
 */

import { FinancialProvider, FinancialData } from './FinancialProvider';
import { MasterCompanyRegistry } from '../data/MasterCompanyRegistry';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';

const IS_SANDBOX = process.env.UPSTOX_SANDBOX_ENABLED === 'true' || process.env.UPSTOX_SANDBOX_MODE === 'true';
const API_BASE = IS_SANDBOX ? 'https://sandbox-api.upstox.com/v2/fundamentals' : 'https://api.upstox.com/v2/fundamentals';
const REQUEST_TIMEOUT_MS = 10_000;
const FUNDAMENTALS_CACHE_POLICY = { ttlMs: 3_600_000, staleWindowMs: 3_600_000, negativeTtlMs: 120_000 } as const;

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

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
      this.fetchKeyRatios(clean, isin, token),
      this.fetchBalanceSheet(clean, isin, token),
    ]);

    if (ratios.status === 'rejected' && balanceSheet.status === 'rejected') {
      throw new Error(
        `UpstoxFundamentals: all endpoints failed for ${clean}: ` +
          `${ratios.reason?.message || ratios.reason}; ` +
          `${balanceSheet.reason?.message || balanceSheet.reason}`,
      );
    }

    const ratioData = ratios.status === 'fulfilled' ? ratios.value : null;
    const bsData = balanceSheet.status === 'fulfilled' ? balanceSheet.value : null;

    // ── Parse ratios ──────────────────────────────────────
    const parseRatioValue = (name: string, raw: string | undefined): number | undefined => {
      if (!raw || raw === 'N/A') return undefined;
      // Strip % suffix if present
      const cleaned = raw.replace(/%$/, '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return undefined;
      // IMPORTANT: Ratios like ROE, ROA, ROCE come as percentages (e.g., "8.94%")
      // DO NOT divide by 100 — 8.94% means 8.94, not 0.0894
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
      periodEnd: latestBs?.period ? this.parsePeriod(latestBs.period) : undefined,
      sourceAsOf: latestBs?.period ? this.parsePeriod(latestBs.period) : undefined,
      retrievedAt: new Date().toISOString(),

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

  private async fetchKeyRatios(symbol: string, isin: string, token: string): Promise<any> {
    const url = `${API_BASE}/${isin}/key-ratios`;
      const result = await (await getSharedProviderRequestBroker()).execute('upstox', 'key_ratios', symbol, { isin, sandbox: IS_SANDBOX }, async () => {
      const resp = await this.fetchWithTimeout(url, token);
      return {
        data: await this.readJsonSafely(resp),
        status: resp.status,
        headers: headersToRecord(resp.headers),
      };
    }, {
      cachePolicy: FUNDAMENTALS_CACHE_POLICY,
      runId: getCurrentIngestionRunId(),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!result.success || result.data === null) {
      throw new Error(`UpstoxFundamentals key ratios unavailable for ${symbol}: ${result.statusClass}`);
    }
    return result.data;
  }

  private async fetchBalanceSheet(symbol: string, isin: string, token: string): Promise<any> {
    const url = `${API_BASE}/${isin}/balance-sheet?type=consolidated`;
      const result = await (await getSharedProviderRequestBroker()).execute('upstox', 'balance_sheet', symbol, { isin, type: 'consolidated', sandbox: IS_SANDBOX }, async () => {
      const resp = await this.fetchWithTimeout(url, token);
      const data = await this.readJsonSafely(resp);
      return {
        data,
        status: resp.status,
        headers: headersToRecord(resp.headers),
        sourceAsOf: this.sourceAsOfBalanceSheet(data),
      };
    }, {
      cachePolicy: FUNDAMENTALS_CACHE_POLICY,
      runId: getCurrentIngestionRunId(),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!result.success || result.data === null) {
      throw new Error(`UpstoxFundamentals balance sheet unavailable for ${symbol}: ${result.statusClass}`);
    }
    return result.data;
  }

  private async fetchWithTimeout(url: string, token: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error(`UpstoxFundamentals: request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJsonSafely(resp: Response): Promise<any> {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }

  private sourceAsOfBalanceSheet(data: any): string | undefined {
    const period = data?.data?.history?.[0]?.period;
    return typeof period === 'string' ? this.parsePeriod(period) : undefined;
  }

  /** Convert "Mar 2025" → actual calendar month end, or undefined. */
  private parsePeriod(period: string): string | undefined {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const match = period.match(/^([A-Z][a-z]{2})\s+(\d{4})$/);
    if (!match) return undefined;
    const month = months[match[1]];
    const year = Number(match[2]);
    if (month === undefined || !Number.isInteger(year)) return undefined;
    return new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
  }
}
