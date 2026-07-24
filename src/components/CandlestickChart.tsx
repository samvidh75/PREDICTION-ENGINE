import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { colors, space, radius, typography } from "../design/tokens";

export interface PriceCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  ticker: string;
  candles: PriceCandle[];
  upperBand?: number[];
  lowerBand?: number[];
  sma50?: number[];
  sma200?: number[];
}

export function CandlestickChart({
  ticker,
  candles,
  upperBand,
  lowerBand,
  sma50,
  sma200,
}: CandlestickChartProps) {
  if (!candles || candles.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          color: colors.textTertiary,
          fontFamily: typography.fontFamily,
          fontSize: 12,
          padding: `${space[16]} 0`,
          border: `1px dashed ${colors.hairline}`,
          borderRadius: radius.xl,
          background: `${colors.canvas}66`,
        }}
      >
        Waiting for raw exchange data stream to plot candlestick metrics...
      </div>
    );
  }

  const candlestickSeries = candles.map((c) => ({
    x: new Date(c.timestamp * 1000),
    y: [c.open, c.high, c.low, c.close],
  }));

  const seriesData: ApexOptions["series"] = [
    {
      name: "Candlestick",
      type: "candlestick",
      data: candlestickSeries,
    },
  ];

  if (upperBand && upperBand.length === candles.length) {
    seriesData.push({
      name: "Upper Band",
      type: "line",
      data: candles.map((c, i) => ({
        x: new Date(c.timestamp * 1000),
        y: upperBand[i],
      })),
    });
  }

  if (lowerBand && lowerBand.length === candles.length) {
    seriesData.push({
      name: "Lower Band",
      type: "line",
      data: candles.map((c, i) => ({
        x: new Date(c.timestamp * 1000),
        y: lowerBand[i],
      })),
    });
  }

  if (sma50 && sma50.length === candles.length) {
    seriesData.push({
      name: "SMA-50",
      type: "line",
      data: candles.map((c, i) => ({
        x: new Date(c.timestamp * 1000),
        y: sma50[i],
      })),
    });
  }

  if (sma200 && sma200.length === candles.length) {
    seriesData.push({
      name: "SMA-200",
      type: "line",
      data: candles.map((c, i) => ({
        x: new Date(c.timestamp * 1000),
        y: sma200[i],
      })),
    });
  }

  const chartOptions: ApexOptions = {
    chart: {
      id: "stockstory-main-chart",
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: false },
    },
    theme: { mode: "dark" },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: "#707070", fontSize: "10px", fontFamily: typography.fontFamily },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: {
        style: { colors: "#707070", fontSize: "10px", fontFamily: typography.fontFamily },
      },
    },
    grid: { borderColor: "#1A1A1A", strokeDashArray: 4 },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#34C759",
          downward: "#FF3B30",
        },
        wick: { useFillColor: true },
      },
    },
    stroke: {
      width: Array(seriesData.length).fill(1) as number[],
      curve: "smooth" as const,
      dashArray: seriesData.map((s) => {
        if (s.name === "SMA-50" || s.name === "SMA-200") return 0;
        if (s.name === "Upper Band" || s.name === "Lower Band") return 4;
        return 0;
      }),
    },
    colors: ["#57c1ff", "#FF3B30", "#34C759", "#FF9800", "#E91E63"],
    legend: { show: false },
  };

  return (
    <div
      style={{
        background: colors.surface,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.xl,
        padding: space[4],
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: space[4],
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: colors.accentBlue,
              fontFamily: typography.fontFamily,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {ticker} Live Chart Feed
          </h3>
          <p
            style={{
              fontSize: 9,
              color: colors.textTertiary,
              fontFamily: typography.fontFamily,
              margin: `${space[1]} 0 0 0`,
            }}
          >
            End-of-day candles + local parameter overlay
          </p>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: colors.textTertiary,
            fontFamily: typography.fontFamily,
            background: colors.canvas,
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            padding: `${space[1]} ${space[2]}`,
            borderRadius: radius.sm,
            border: `1px solid ${colors.hairline}`,
          }}
        >
          1D Interval
        </span>
      </div>

      <div style={{ height: 256, width: "100%" }}>
        <Chart
          options={chartOptions}
          series={seriesData}
          type="candlestick"
          height="100%"
        />
      </div>
    </div>
  );
}
