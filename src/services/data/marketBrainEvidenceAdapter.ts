import type { EvidenceState, MarketDataDomain } from '../../systems/market-brain/indiaMarketBrain';
import type { AdapterResult } from './dataAdapterTypes';

export interface MarketBrainAdapterEvidenceInput {
  instrumentMaster?: AdapterResult<unknown> | null;
  prices?: AdapterResult<unknown> | null;
  fundamentals?: AdapterResult<unknown> | null;
  financialStatements?: AdapterResult<unknown> | null;
  technicals?: AdapterResult<unknown> | null;
  sectorContext?: AdapterResult<unknown> | null;
  newsEvents?: AdapterResult<unknown> | null;
  ownership?: AdapterResult<unknown> | null;
  derivatives?: AdapterResult<unknown> | null;
  corporateActions?: AdapterResult<unknown> | null;
  shareholding?: AdapterResult<unknown> | null;
}

const DOMAIN_RESULT_KEYS: Array<[MarketDataDomain, keyof MarketBrainAdapterEvidenceInput]> = [
  ['instrument_master', 'instrumentMaster'],
  ['prices', 'prices'],
  ['fundamentals', 'fundamentals'],
  ['financial_statements', 'financialStatements'],
  ['technicals', 'technicals'],
  ['sector_context', 'sectorContext'],
  ['news_events', 'newsEvents'],
  ['ownership', 'ownership'],
  ['derivatives', 'derivatives'],
  ['corporate_actions', 'corporateActions'],
  ['shareholding', 'shareholding'],
];

function toEvidenceState(result: AdapterResult<unknown> | null | undefined): EvidenceState {
  if (!result) return 'missing';
  if (!result.ok) return 'missing';
  return result.warnings.length > 0 ? 'partial' : 'ready';
}

export function buildMarketBrainEvidenceFromAdapterResults(
  input: MarketBrainAdapterEvidenceInput,
): Partial<Record<MarketDataDomain, EvidenceState>> {
  const evidence: Partial<Record<MarketDataDomain, EvidenceState>> = {};

  DOMAIN_RESULT_KEYS.forEach(([domain, key]) => {
    evidence[domain] = toEvidenceState(input[key]);
  });

  return { ...evidence };
}
