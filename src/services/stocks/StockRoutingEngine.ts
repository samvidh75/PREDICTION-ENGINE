export class StockRoutingEngine {
  /**
   * Safely routes users to specific company profile boards using deep-link URLs
   */
  public static routeToStock(symbol: string): void {
    if (typeof window === 'undefined') return;
    try {
      const cleanSymbol = symbol.trim().toUpperCase();
      const newUrl = `${window.location.origin}${window.location.pathname}?page=company&id=${cleanSymbol}`;
      window.history.pushState({ page: 'company', id: cleanSymbol }, '', newUrl);
      window.dispatchEvent(new Event('popstate')); // trigger re-render hooks
    } catch (err) {
      console.error('Failed to execute StockRoute pushState:', err);
    }
  }
}

export default StockRoutingEngine;
