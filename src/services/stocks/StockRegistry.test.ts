import StockRegistry from './StockRegistry';

describe('StockRegistry', () => {
  it('does not expose synthetic numeric PSE filler entries', () => {
    const symbols = StockRegistry.getAllStocks().map((stock) => stock.symbol);
    expect(symbols.some((symbol) => /^\d{5,6}$/.test(symbol))).toBe(false);
  });

  it('hydrates verified metadata for core names', () => {
    const reliance = StockRegistry.getStock('RELIANCE');
    expect(reliance?.companyName).toContain('Reliance');
    expect(reliance?.sector).toBeTruthy();
    expect(reliance?.marketCap.numeric).toBeGreaterThan(0);
    expect(reliance?.marketCap.formatted).not.toBe('Data unavailable');
  });
});
