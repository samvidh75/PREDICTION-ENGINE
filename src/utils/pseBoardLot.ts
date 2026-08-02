/**
 * PSE board lot, tick size, and standard transaction cost math.
 *
 * Board lot / tick size tiers below follow the PSE's commonly-published
 * board lot table. These tiers are set by the exchange and do change from
 * time to time — verify against the current official PSE board lot table
 * (pse.com.ph) before relying on this for real trading decisions.
 *
 * Regulatory fees (PSE transaction fee, SCCP fee, stock transaction tax)
 * are set by the exchange/BIR and are stable. Broker commission is NOT
 * exchange-mandated — every broker sets its own rate (and most enforce a
 * minimum peso amount per trade); the rate here is a common default and
 * should be treated as an estimate, not what any specific broker charges.
 */

export interface BoardLotTier {
  minPrice: number;
  maxPrice: number;
  lotSize: number;
  tickSize: number;
}

/** Ascending by minPrice; maxPrice is exclusive except for the last (open-ended) tier. */
export const PSE_BOARD_LOT_TABLE: readonly BoardLotTier[] = [
  { minPrice: 0.0001, maxPrice: 0.01, lotSize: 1_000_000, tickSize: 0.0001 },
  { minPrice: 0.01, maxPrice: 0.05, lotSize: 100_000, tickSize: 0.001 },
  { minPrice: 0.05, maxPrice: 0.25, lotSize: 10_000, tickSize: 0.001 },
  { minPrice: 0.25, maxPrice: 0.5, lotSize: 10_000, tickSize: 0.001 },
  { minPrice: 0.5, maxPrice: 5, lotSize: 1_000, tickSize: 0.01 },
  { minPrice: 5, maxPrice: 10, lotSize: 100, tickSize: 0.01 },
  { minPrice: 10, maxPrice: 20, lotSize: 100, tickSize: 0.01 },
  { minPrice: 20, maxPrice: 50, lotSize: 10, tickSize: 0.01 },
  { minPrice: 50, maxPrice: 100, lotSize: 10, tickSize: 0.01 },
  { minPrice: 100, maxPrice: 200, lotSize: 5, tickSize: 0.01 },
  { minPrice: 200, maxPrice: 500, lotSize: 5, tickSize: 0.01 },
  { minPrice: 500, maxPrice: 1_000, lotSize: 5, tickSize: 0.01 },
  { minPrice: 1_000, maxPrice: Infinity, lotSize: 5, tickSize: 0.01 },
];

export function getBoardLotTier(price: number): BoardLotTier {
  const tier = PSE_BOARD_LOT_TABLE.find(
    (t) => price >= t.minPrice && (price < t.maxPrice || t.maxPrice === Infinity),
  );
  return tier ?? PSE_BOARD_LOT_TABLE[0];
}

/** Board lot size (minimum tradeable share multiple) for a given price. */
export function getBoardLotSize(price: number): number {
  return getBoardLotTier(price).lotSize;
}

/** Minimum price increment (tick size) for a given price. */
export function getTickSize(price: number): number {
  return getBoardLotTier(price).tickSize;
}

/** Round a share count down to the nearest valid board lot multiple. */
export function roundToBoardLot(shares: number, price: number): number {
  const lot = getBoardLotSize(price);
  return Math.floor(shares / lot) * lot;
}

/** Round a limit price to the nearest valid tick for its price tier. */
export function roundToTick(price: number): number {
  const tick = getTickSize(price);
  return Math.round(price / tick) * tick;
}

// ── Transaction costs ──────────────────────────────────────────────────

/** Exchange/regulatory rates — stable, not broker-configurable. */
export const PSE_REGULATORY_RATES = {
  /** PSE transaction fee, charged on both buys and sells. */
  pseFee: 0.00005,
  /** Securities Clearing Corp. of the Philippines fee, both buys and sells. */
  sccpFee: 0.0001,
  /** BIR stock transaction tax — SELLS ONLY. */
  stockTransactionTax: 0.006,
  /** VAT applied on top of broker commission. */
  vatOnCommission: 0.12,
} as const;

export interface FeeBreakdown {
  grossAmount: number;
  commission: number;
  vatOnCommission: number;
  pseFee: number;
  sccpFee: number;
  stockTransactionTax: number;
  totalFees: number;
  netAmount: number;
}

/**
 * Estimate the full cost breakdown for a buy or sell order.
 * `commissionRate` defaults to 0.25%, a common broker rate — pass the
 * user's actual broker rate when known, since this is not exchange-set.
 */
export function calculateTransactionCosts(
  shares: number,
  price: number,
  side: "buy" | "sell",
  commissionRate = 0.0025,
  minCommission = 20,
): FeeBreakdown {
  const grossAmount = shares * price;
  const commission = Math.max(grossAmount * commissionRate, minCommission);
  const vatOnCommission = commission * PSE_REGULATORY_RATES.vatOnCommission;
  const pseFee = grossAmount * PSE_REGULATORY_RATES.pseFee;
  const sccpFee = grossAmount * PSE_REGULATORY_RATES.sccpFee;
  const stockTransactionTax = side === "sell" ? grossAmount * PSE_REGULATORY_RATES.stockTransactionTax : 0;

  const totalFees = commission + vatOnCommission + pseFee + sccpFee + stockTransactionTax;
  const netAmount = side === "buy" ? grossAmount + totalFees : grossAmount - totalFees;

  return {
    grossAmount: round2(grossAmount),
    commission: round2(commission),
    vatOnCommission: round2(vatOnCommission),
    pseFee: round2(pseFee),
    sccpFee: round2(sccpFee),
    stockTransactionTax: round2(stockTransactionTax),
    totalFees: round2(totalFees),
    netAmount: round2(netAmount),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
