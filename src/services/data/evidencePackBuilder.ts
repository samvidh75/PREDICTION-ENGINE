import type { AdapterResult, MarketDataDomain } from "./dataAdapterTypes";
import { canonicalNow, normalizeAdapterSymbol } from "./normalizeDataRecord";

export interface MarketEvidenceItem {
  id: string;
  domain: MarketDataDomain;
  summary: string;
  asOf: string;
}

export interface MarketEvidencePack {
  symbol: string;
  asOf: string;
  availableDomains: MarketDataDomain[];
  partialDomains: MarketDataDomain[];
  missingDomains: MarketDataDomain[];
  evidenceItems: MarketEvidenceItem[];
}

export interface EvidencePackInputs {
  symbol: string;
  financials?: AdapterResult<unknown>;
  price?: AdapterResult<unknown[]>;
  newsEvents?: AdapterResult<unknown[]>;
  ownership?: AdapterResult<unknown>;
  derivatives?: AdapterResult<unknown>;
  sectorMacro?: AdapterResult<unknown>;
  corporateActions?: AdapterResult<unknown[]>;
}

const DOMAIN_ORDER: MarketDataDomain[] = [
  "financial_statements",
  "price_volume",
  "news_events",
  "ownership",
  "derivatives",
  "sector_context",
  "corporate_actions",
];

const RESULT_KEYS: Record<MarketDataDomain, keyof EvidencePackInputs> = {
  financial_statements: "financials",
  price_volume: "price",
  news_events: "newsEvents",
  ownership: "ownership",
  derivatives: "derivatives",
  sector_context: "sectorMacro",
  corporate_actions: "corporateActions",
};

function hasData(result: AdapterResult<unknown> | AdapterResult<unknown[]> | undefined): boolean {
  if (!result?.ok) return false;
  return Array.isArray(result.data) ? result.data.length > 0 : result.data !== null && result.data !== undefined;
}

function itemSummary(domain: MarketDataDomain, symbol: string): string {
  switch (domain) {
    case "financial_statements": return `Financial statement evidence is available for ${symbol}.`;
    case "price_volume": return `Price and volume evidence is available for ${symbol}.`;
    case "news_events": return `News and event evidence is available for ${symbol}.`;
    case "ownership": return `Ownership evidence is available for ${symbol}.`;
    case "derivatives": return `Derivatives evidence is available for ${symbol}.`;
    case "sector_context": return `Sector context evidence is available for ${symbol}.`;
    case "corporate_actions": return `Corporate action evidence is available for ${symbol}.`;
  }
}

export function buildMarketEvidencePack(inputs: EvidencePackInputs): MarketEvidencePack {
  const symbol = normalizeAdapterSymbol(inputs.symbol) ?? "UNKNOWN";
  const asOf = canonicalNow();
  const availableDomains: MarketDataDomain[] = [];
  const missingDomains: MarketDataDomain[] = [];
  const evidenceItems: MarketEvidenceItem[] = [];

  for (const domain of DOMAIN_ORDER) {
    const key = RESULT_KEYS[domain];
    const result: AdapterResult<unknown> | AdapterResult<unknown[]> | undefined = key === "financials" ? inputs.financials
      : key === "price" ? inputs.price
      : key === "newsEvents" ? inputs.newsEvents
      : key === "ownership" ? inputs.ownership
      : key === "derivatives" ? inputs.derivatives
      : key === "sectorMacro" ? inputs.sectorMacro
      : key === "corporateActions" ? inputs.corporateActions
      : undefined;
    if (hasData(result)) {
      availableDomains.push(domain);
      evidenceItems.push({ id: `${symbol}:${domain}`, domain, summary: itemSummary(domain, symbol), asOf: result?.asOf ?? asOf });
    } else {
      missingDomains.push(domain);
    }
  }

  return {
    symbol,
    asOf,
    availableDomains: [...availableDomains],
    partialDomains: [],
    missingDomains: missingDomains.filter(domain => !availableDomains.includes(domain)),
    evidenceItems: [...evidenceItems],
  };
}
