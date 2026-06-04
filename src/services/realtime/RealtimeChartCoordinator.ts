export interface ChartViewportState {
  zoomLevel: number;
  scrollOffset: number;
  selectedRange: { start: number; end: number } | null;
}

class RealtimeChartCoordinator {
  private viewportStates: Map<string, ChartViewportState> = new Map();

  public getViewportState(symbol: string): ChartViewportState {
    const sym = symbol.toUpperCase();
    return this.viewportStates.get(sym) || {
      zoomLevel: 1.0,
      scrollOffset: 0,
      selectedRange: null
    };
  }

  public saveViewportState(symbol: string, state: ChartViewportState): void {
    const sym = symbol.toUpperCase();
    this.viewportStates.set(sym, state);
  }

  public clearViewportState(symbol: string): void {
    const sym = symbol.toUpperCase();
    this.viewportStates.delete(sym);
  }
}

export const realtimeChartCoordinator = new RealtimeChartCoordinator();
export default realtimeChartCoordinator;
