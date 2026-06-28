/**
 * commercial/BrokerHandoffService — Research → broker handoff flow.
 *
 * Whenever a user clicks "Continue with broker" the service:
 *  1. Generates a research summary that the user can review
 *  2. Shows a SEBI disclaimer
 *  3. Provides a broker-specific URL (deep‑link or external)
 *
 * StockStory India does NOT place trades, charge brokerage, or
 * handle funds.  All trade execution happens on the broker's platform.
 */

import { BrokerEntry, getBroker, getRegisteredBrokers } from './BrokerRegistry';

export interface HandoffPayload {
  broker: BrokerEntry;
  /** Summary of the research the user reviewed */
  researchSummary: string;
  /** Deep‑link or URL to open on the broker's side */
  handoffUrl: string;
  /** SEBI compliance notice */
  disclaimer: string;
  /** ISO timestamp of handoff */
  timestamp: string;
}

const SEBI_DISCLAIMER =
  'StockStory India is not a SEBI-registered investment advisor. All research is for educational ' +
  'and informational purposes only. Trade execution occurs solely on the broker platform. ' +
  'Past performance does not guarantee future results. Consult your financial advisor before trading.';

/**
 * Build the handoff payload for a given broker + stock.
 * Generates the review summary and broker URL.
 */
export function prepareHandoff(
  brokerId: string,
  stockSymbol: string,
  direction: 'long' | 'short',
  rationale: string,
  confidence: number,
): HandoffPayload | null {
  const broker = getBroker(brokerId);
  if (!broker || !broker.connected) return null;

  const researchSummary = [
    `Symbol: ${stockSymbol.toUpperCase()}`,
    `Direction: ${direction.toUpperCase()}`,
    `Confidence: ${confidence}%`,
    `Rationale: ${rationale}`,
  ].join(' | ');

  const handoffUrl = buildBrokerUrl(broker.id, stockSymbol, direction);

  return {
    broker,
    researchSummary,
    handoffUrl,
    disclaimer: SEBI_DISCLAIMER,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Return the SEBI disclaimer text (used wherever handoff UI is rendered).
 */
export function getDisclaimer(): string {
  return SEBI_DISCLAIMER;
}

/**
 * List all available brokers for the handoff screen.
 */
export function listAvailableBrokers() {
  return getRegisteredBrokers();
}

/** ─── internal ─── */

function buildBrokerUrl(
  brokerId: string,
  symbol: string,
  direction: 'long' | 'short',
): string {
  // In production each broker provides its own deep‑link format.
  const baseUrls: Record<string, string> = {
    upstox: 'https://upstox.com/trading',
  };
  const base = baseUrls[brokerId] ?? 'https://example.com/trade';
  return `${base}/${symbol.toLowerCase()}/${direction}`;
}
