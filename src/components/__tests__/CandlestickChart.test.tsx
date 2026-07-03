import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CandlestickChart, type PriceCandle } from '../CandlestickChart';

const mockCandles: PriceCandle[] = [
  { timestamp: 1700000000, open: 100, high: 105, low: 99, close: 104, volume: 10000 },
  { timestamp: 1700000001, open: 104, high: 108, low: 102, close: 107, volume: 12000 },
  { timestamp: 1700000002, open: 107, high: 110, low: 106, close: 109, volume: 15000 },
];

describe('CandlestickChart', () => {
  it('renders empty state when no candles provided', () => {
    render(<CandlestickChart ticker="RELIANCE" candles={[]} />);
    expect(screen.getByText(/Waiting for raw exchange data stream/i)).toBeDefined();
  });

  it('renders chart with candles', () => {
    const { container } = render(<CandlestickChart ticker="RELIANCE" candles={mockCandles} />);
    expect(screen.getByText(/RELIANCE Live Chart Feed/i)).toBeDefined();
    expect(container.querySelector('.apexcharts-canvas')).toBeDefined();
  });

  it('renders Bollinger Bands when provided', () => {
    const upperBand = [110, 112, 114];
    const lowerBand = [90, 92, 94];
    render(
      <CandlestickChart
        ticker="INFY"
        candles={mockCandles}
        upperBand={upperBand}
        lowerBand={lowerBand}
      />,
    );
    expect(screen.getByText(/INFY Live Chart Feed/i)).toBeDefined();
  });

  it('renders SMA-50 and SMA-200 overlays when provided', () => {
    const sma50 = [102, 105, 107];
    const sma200 = [98, 99, 101];
    render(
      <CandlestickChart
        ticker="TCS"
        candles={mockCandles}
        sma50={sma50}
        sma200={sma200}
      />,
    );
    expect(screen.getByText(/TCS Live Chart Feed/i)).toBeDefined();
  });

  it('renders all overlays simultaneously when all props provided', () => {
    const sma50 = [102, 105, 107];
    const sma200 = [98, 99, 101];
    const upperBand = [110, 112, 114];
    const lowerBand = [90, 92, 94];
    const { container } = render(
      <CandlestickChart
        ticker="SBIN"
        candles={mockCandles}
        upperBand={upperBand}
        lowerBand={lowerBand}
        sma50={sma50}
        sma200={sma200}
      />,
    );
    expect(screen.getByText(/SBIN Live Chart Feed/i)).toBeDefined();
    expect(container.querySelector('.apexcharts-canvas')).toBeDefined();
  });

  it('ignores SMA arrays with mismatched length', () => {
    const sma50 = [102]; // wrong length
    render(
      <CandlestickChart ticker="HDFC" candles={mockCandles} sma50={sma50} />,
    );
    expect(screen.getByText(/HDFC Live Chart Feed/i)).toBeDefined();
  });
});
