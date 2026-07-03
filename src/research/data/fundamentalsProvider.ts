/**
 * Fundamentals Provider: Fetches fundamental data for a symbol.
 * Delegates to the existing data pipeline.
 */

export async function fetchFundamentals(symbol: string) {
  try {
    const { getStockFundamentals } = await import('../../services/fundamentals/fundamentalStore');
    return await getStockFundamentals(symbol);
  } catch {
    return null;
  }
}
