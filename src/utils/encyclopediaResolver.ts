export interface EncyclopediaData {
  ticker: string;
  exchange: 'nse' | 'bse';
  marketCapCr: number;
  peRatio: number;
  debtToEquity: number;
  pledgePct: number;
  auditOpinion: string;
}

const AUDIT_MAP: Record<string, string> = {
  '{audit_clean_no_misstate}': 'Clean audit with no material misstatements',
  '{audit_clean}': 'Clean audit opinion',
  '{audit_qualified}': 'Qualified opinion on contingent liabilities',
  '{audit_unmodified}': 'Unmodified opinion',
  '{audit_unmodified_emphasis}': 'Unmodified opinion with emphasis of matter',
};

const EXCHANGE_MAP: Record<string, string> = {
  '{exchange_nse}': 'PSE Mainboard/SME',
  '{exchange_bse}': 'PSE',
};

export function resolveEncyclopediaPlaceholders(
  template: string,
  data: EncyclopediaData,
): string {
  let result = template
    .replace('{ticker}', data.ticker)
    .replace('{market_cap}', `Rs${data.marketCapCr.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .replace('{pe_ratio}', String(data.peRatio))
    .replace('{de_ratio}', String(data.debtToEquity))
    .replace('{pledge_pct}', String(data.pledgePct));

  for (const [ph, val] of Object.entries(EXCHANGE_MAP)) {
    result = result.replace(ph, val);
  }
  for (const [ph, val] of Object.entries(AUDIT_MAP)) {
    result = result.replace(ph, val);
  }

  return result;
}

export function generateDemoData(ticker: string): EncyclopediaData {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ((hash << 5) - hash) + ticker.charCodeAt(i);
    hash |= 0;
  }
  const seededRandom = (min: number, max: number) => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return min + (hash % (max - min));
  };

  const opinions = [
    'Clean audit with no material misstatements',
    'Clean audit opinion',
    'Qualified opinion on contingent liabilities',
    'Unmodified opinion',
    'Unmodified opinion with emphasis of matter',
  ];

  return {
    ticker,
    exchange: seededRandom(0, 2) ? 'nse' : 'bse',
    marketCapCr: seededRandom(500, 800000),
    peRatio: seededRandom(8, 65),
    debtToEquity: seededRandom(5, 350) / 100,
    pledgePct: seededRandom(0, 1800) / 100,
    auditOpinion: opinions[seededRandom(0, opinions.length)],
  };
}
