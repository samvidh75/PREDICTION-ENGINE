import { useState } from "react";
import { colors, typography, radius } from "../design/tokens";

type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";
type ChartType = "candles" | "line" | "area" | "bars";
type Indicator = "SMA" | "EMA" | "MACD" | "RSI" | "BB" | "Volume" | "None";

interface ChartToolbarProps {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: Indicator[];
  onTimeframeChange: (t: Timeframe) => void;
  onChartTypeChange: (t: ChartType) => void;
  onIndicatorToggle: (i: Indicator) => void;
}

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"];
const CHART_TYPES: ChartType[] = ["candles", "line", "area", "bars"];
const INDICATORS: Indicator[] = ["SMA", "EMA", "MACD", "RSI", "BB", "Volume"];

function Pill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? colors.primary : "transparent",
        color: active ? colors.onPrimary : colors.mute,
        border: `1px solid ${active ? colors.primary : colors.hairline}`,
        borderRadius: radius.full,
        padding: "4px 12px",
        fontSize: typography.captionSm.size,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

export function AdvancedChartToolbar({
  symbol, timeframe, chartType, indicators,
  onTimeframeChange, onChartTypeChange, onIndicatorToggle,
}: ChartToolbarProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 16px",
      background: colors.surface,
      borderRadius: radius.lg,
      border: `1px solid ${colors.hairline}`,
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: typography.body.size, fontWeight: 700, color: colors.ink, marginRight: "8px" }}>
        {symbol}
      </span>

      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: typography.captionSm.size, color: colors.mute, marginRight: "4px" }}>TF:</span>
        {TIMEFRAMES.map(tf => (
          <Pill key={tf} active={timeframe === tf} label={tf} onClick={() => onTimeframeChange(tf)} />
        ))}
      </div>

      <div style={{ width: "1px", height: "24px", background: colors.hairline }} />

      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: typography.captionSm.size, color: colors.mute, marginRight: "4px" }}>Type:</span>
        {CHART_TYPES.map(ct => (
          <Pill key={ct} active={chartType === ct} label={ct} onClick={() => onChartTypeChange(ct)} />
        ))}
      </div>

      <div style={{ width: "1px", height: "24px", background: colors.hairline }} />

      <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: typography.captionSm.size, color: colors.mute, marginRight: "4px" }}>Indicators:</span>
        {INDICATORS.map(ind => (
          <Pill key={ind} active={indicators.includes(ind)} label={ind} onClick={() => onIndicatorToggle(ind)} />
        ))}
      </div>
    </div>
  );
}

export function useChartToolbar(initialSymbol: string) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const toggleIndicator = (ind: Indicator) => {
    setIndicators(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind],
    );
  };

  return {
    state: { timeframe, chartType, indicators },
    setters: {
      onTimeframeChange: setTimeframe,
      onChartTypeChange: setChartType,
      onIndicatorToggle: toggleIndicator,
    },
  };
}
