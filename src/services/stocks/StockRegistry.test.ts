import StockRegistry from './StockRegistry';

describe('StockRegistry', () => {
  it('does not expose synthetic numeric PSE filler entries', () => {
    const symbols = StockRegistry.getAllStocks().map((stock) => stock.symbol);
    expect(symbols.some((symbol) => /^\d{5,6}$/.test(symbol))).toBe(false);
  });

  it('hydrates verified metadata for core names', () => {
    // StockRegistry only hydrates marketCap for symbols present in BOTH the
    // base universe (generate500Stocks, sourced from the real 294-company PSE
    // dataset) and the verified registry (MasterCompanyRegistry, also PSE).
    // Both lists are now genuinely PSE-listed, so real blue chips like BDO
    // overlap and exercise full hydration end-to-end.
    const bdo = StockRegistry.getStock('BDO');
    expect(bdo?.companyName).toContain('BDO Unibank');
    expect(bdo?.sector).toBeTruthy();
    expect(bdo?.marketCap.numeric).toBeGreaterThan(0);
    expect(bdo?.marketCap.formatted).not.toBe('Data unavailable');
  });
});
