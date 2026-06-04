export type ChartViewportState = {
  zoomLevel: number;
  panOffset: number;
  crosshairX: number | null;
  crosshairY: number | null;
  selectedTimeframe: string;
};

export class RealtimeChartCoordinator {
  private static chartState = new Map<string, ChartViewportState>();

  static saveChartState(ticker: string, state: ChartViewportState): void {
    this.chartState.set(ticker.toUpperCase(), { ...state });
  }

  static getChartState(ticker: string): ChartViewportState | null {
    return this.chartState.get(ticker.toUpperCase()) || null;
  }

  static clear(): void {
    this.chartState.clear();
  }
}
