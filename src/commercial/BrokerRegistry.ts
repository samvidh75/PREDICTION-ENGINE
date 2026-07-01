/**
 * commercial/BrokerRegistry — Registered brokers for handoff.
 *
 * Lensory provides read-only research analysis and a
 * "Continue with broker" handoff.  No order placement, no trading,
 * no transaction fees, no SEBI registration for brokerage.
 *
 * Only real, integrated brokers appear here.  No fake broker entries.
 * Currently supported: Upstox (OAuth read-only connected).
 */

export interface BrokerEntry {
  id: string;
  name: string;
  /** Display logo placeholder (path or URL) */
  logo?: string;
  /** Is this broker connected and available for handoff? */
  connected: boolean;
  /** Compliance-safe description */
  description: string;
  /** SEBI registration status */
  sebiRegistered: boolean;
  /** Supported features */
  supports: ('research_review' | 'portfolio_import' | 'watchlist_sync')[];
}

const REGISTERED_BROKERS: BrokerEntry[] = [
  {
    id: 'upstox',
    name: 'Upstox',
    connected: true,
    description: 'Continue your research on Upstox for order execution.',
    sebiRegistered: true,
    supports: ['research_review', 'portfolio_import'],
  },
];

export function getRegisteredBrokers(): BrokerEntry[] {
  return REGISTERED_BROKERS.filter((b) => b.connected);
}

export function getBroker(id: string): BrokerEntry | undefined {
  return REGISTERED_BROKERS.find((b) => b.id === id);
}
