/**
 * commercial/BrokerRegistry — Registered brokers for handoff.
 *
 * Lensory provides read-only research analysis and a
 * "Continue with broker" handoff.  No order placement, no trading,
 * no transaction fees, no SEC registration for brokerage.
 *
 * Only real, integrated brokers appear here.  No fake broker entries.
 * No broker is currently integrated for PSE order handoff.
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
  /** SEC registration status */
  secRegistered: boolean;
  /** Supported features */
  supports: ('research_review' | 'portfolio_import' | 'watchlist_sync')[];
}

const REGISTERED_BROKERS: BrokerEntry[] = [];

export function getRegisteredBrokers(): BrokerEntry[] {
  return REGISTERED_BROKERS.filter((b) => b.connected);
}

export function getBroker(id: string): BrokerEntry | undefined {
  return REGISTERED_BROKERS.find((b) => b.id === id);
}
