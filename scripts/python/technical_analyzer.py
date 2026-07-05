#!/usr/bin/env python3
"""
Technical Analysis Engine
Complete technical indicators for short-term trading analysis
"""

import json
import sys
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum


class Signal(Enum):
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    NEUTRAL = "NEUTRAL"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"


@dataclass
class IndicatorResult:
    """Single indicator result"""
    name: str
    value: float
    signal: str
    explanation: str
    confidence: float  # 0-1


class TechnicalAnalyzer:
    """Complete technical analysis engine"""

    def __init__(self, ohlcv_data: List[Dict[str, float]]):
        """
        Initialize with OHLCV data
        ohlcv_data: [{date, open, high, low, close, volume}, ...]
        """
        self.df = pd.DataFrame(ohlcv_data)
        self.df['close'] = pd.to_numeric(self.df['close'])
        self.df['high'] = pd.to_numeric(self.df['high'])
        self.df['low'] = pd.to_numeric(self.df['low'])
        self.df['open'] = pd.to_numeric(self.df['open'])
        self.df['volume'] = pd.to_numeric(self.df['volume'])

    def calculate_rsi(self, period: int = 14) -> IndicatorResult:
        """
        Relative Strength Index (0-100)
        >70: Overbought, <30: Oversold
        """
        delta = self.df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        current_rsi = rsi.iloc[-1]

        if current_rsi > 70:
            signal = Signal.SELL.value
            explanation = f"Overbought (RSI {current_rsi:.1f} > 70)"
            confidence = 0.75
        elif current_rsi < 30:
            signal = Signal.BUY.value
            explanation = f"Oversold (RSI {current_rsi:.1f} < 30)"
            confidence = 0.75
        elif current_rsi > 60:
            signal = Signal.NEUTRAL.value
            explanation = f"Strong momentum (RSI {current_rsi:.1f})"
            confidence = 0.60
        elif current_rsi < 40:
            signal = Signal.NEUTRAL.value
            explanation = f"Weak momentum (RSI {current_rsi:.1f})"
            confidence = 0.60
        else:
            signal = Signal.NEUTRAL.value
            explanation = f"Neutral zone (RSI {current_rsi:.1f})"
            confidence = 0.50

        return IndicatorResult(
            name="RSI (14)",
            value=round(current_rsi, 2),
            signal=signal,
            explanation=explanation,
            confidence=confidence
        )

    def calculate_macd(self) -> IndicatorResult:
        """
        MACD (Moving Average Convergence Divergence)
        12-day EMA - 26-day EMA
        Signal: 9-day EMA of MACD
        """
        ema12 = self.df['close'].ewm(span=12, adjust=False).mean()
        ema26 = self.df['close'].ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal

        current_macd = macd.iloc[-1]
        current_signal = signal.iloc[-1]
        current_histogram = histogram.iloc[-1]

        if current_histogram > 0 and current_macd > current_signal:
            signal_val = Signal.BUY.value
            explanation = f"Bullish crossover (MACD {current_macd:.4f} > Signal {current_signal:.4f})"
            confidence = 0.80
        elif current_histogram < 0 and current_macd < current_signal:
            signal_val = Signal.SELL.value
            explanation = f"Bearish crossover (MACD {current_macd:.4f} < Signal {current_signal:.4f})"
            confidence = 0.80
        elif current_histogram > 0:
            signal_val = Signal.NEUTRAL.value
            explanation = f"Positive momentum"
            confidence = 0.65
        else:
            signal_val = Signal.NEUTRAL.value
            explanation = f"Negative momentum"
            confidence = 0.65

        return IndicatorResult(
            name="MACD",
            value=round(current_histogram, 4),
            signal=signal_val,
            explanation=explanation,
            confidence=confidence
        )

    def calculate_bollinger_bands(self, period: int = 20, std_dev: float = 2.0) -> IndicatorResult:
        """
        Bollinger Bands
        Price touching upper band = overbought
        Price touching lower band = oversold
        """
        sma = self.df['close'].rolling(window=period).mean()
        std = self.df['close'].rolling(window=period).std()
        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)
        middle_band = sma

        current_price = self.df['close'].iloc[-1]
        current_upper = upper_band.iloc[-1]
        current_lower = lower_band.iloc[-1]
        current_middle = middle_band.iloc[-1]

        # Calculate position within bands (0-1)
        bb_position = (current_price - current_lower) / (current_upper - current_lower)

        if current_price > current_upper:
            signal_val = Signal.SELL.value
            explanation = f"Price above upper band ({current_price:.2f} > {current_upper:.2f})"
            confidence = 0.70
        elif current_price < current_lower:
            signal_val = Signal.BUY.value
            explanation = f"Price below lower band ({current_price:.2f} < {current_lower:.2f})"
            confidence = 0.70
        elif bb_position > 0.8:
            signal_val = Signal.SELL.value
            explanation = "Near upper band (overbought)"
            confidence = 0.60
        elif bb_position < 0.2:
            signal_val = Signal.BUY.value
            explanation = "Near lower band (oversold)"
            confidence = 0.60
        else:
            signal_val = Signal.NEUTRAL.value
            explanation = "Within normal range"
            confidence = 0.50

        return IndicatorResult(
            name="Bollinger Bands (20,2)",
            value=round(bb_position, 2),
            signal=signal_val,
            explanation=explanation,
            confidence=confidence
        )

    def calculate_atr(self, period: int = 14) -> IndicatorResult:
        """
        Average True Range
        Measures volatility
        High ATR = high volatility (breakout risk)
        Low ATR = low volatility (consolidation)
        """
        high_low = self.df['high'] - self.df['low']
        high_close = abs(self.df['high'] - self.df['close'].shift())
        low_close = abs(self.df['low'] - self.df['close'].shift())

        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = tr.rolling(period).mean()

        current_atr = atr.iloc[-1]
        atr_percentile = (current_atr / self.df['close'].iloc[-1]) * 100

        if atr_percentile > 3:
            signal_val = Signal.SELL.value
            explanation = f"Very high volatility ({atr_percentile:.2f}% of price)"
            confidence = 0.65
        elif atr_percentile > 2:
            signal_val = Signal.NEUTRAL.value
            explanation = f"High volatility ({atr_percentile:.2f}% of price)"
            confidence = 0.60
        elif atr_percentile < 1:
            signal_val = Signal.BUY.value
            explanation = f"Low volatility ({atr_percentile:.2f}% of price) - Breakout imminent"
            confidence = 0.70
        else:
            signal_val = Signal.NEUTRAL.value
            explanation = f"Normal volatility ({atr_percentile:.2f}% of price)"
            confidence = 0.55

        return IndicatorResult(
            name=f"ATR ({period})",
            value=round(current_atr, 2),
            signal=signal_val,
            explanation=explanation,
            confidence=confidence
        )

    def calculate_stochastic(self, k_period: int = 14, k_smooth: int = 3, d_smooth: int = 3) -> IndicatorResult:
        """
        Stochastic Oscillator
        Compares close to range over period
        >80: Overbought, <20: Oversold
        """
        low_min = self.df['low'].rolling(window=k_period).min()
        high_max = self.df['high'].rolling(window=k_period).max()

        k = 100 * ((self.df['close'] - low_min) / (high_max - low_min))
        k_smooth_val = k.rolling(window=k_smooth).mean()
        d = k_smooth_val.rolling(window=d_smooth).mean()

        current_k = k_smooth_val.iloc[-1]
        current_d = d.iloc[-1]

        if current_k > 80:
            signal_val = Signal.SELL.value
            explanation = f"Overbought (K {current_k:.1f} > 80)"
            confidence = 0.75
        elif current_k < 20:
            signal_val = Signal.BUY.value
            explanation = f"Oversold (K {current_k:.1f} < 20)"
            confidence = 0.75
        elif current_k > current_d:
            signal_val = Signal.BUY.value
            explanation = f"K crossing above D (bullish)"
            confidence = 0.65
        elif current_k < current_d:
            signal_val = Signal.SELL.value
            explanation = f"K crossing below D (bearish)"
            confidence = 0.65
        else:
            signal_val = Signal.NEUTRAL.value
            explanation = f"Neutral zone"
            confidence = 0.50

        return IndicatorResult(
            name=f"Stochastic ({k_period},{k_smooth},{d_smooth})",
            value=round(current_k, 2),
            signal=signal_val,
            explanation=explanation,
            confidence=confidence
        )

    def calculate_moving_averages(self, short: int = 20, long: int = 50, vlong: int = 200) -> Dict[str, Any]:
        """
        Moving Averages (SMA & EMA)
        Price above SMA = uptrend
        Price below SMA = downtrend
        """
        sma_short = self.df['close'].rolling(window=short).mean()
        sma_long = self.df['close'].rolling(window=long).mean()
        sma_vlong = self.df['close'].rolling(window=vlong).mean()

        ema_short = self.df['close'].ewm(span=short, adjust=False).mean()
        ema_long = self.df['close'].ewm(span=long, adjust=False).mean()

        current_price = self.df['close'].iloc[-1]

        # Trend determination
        if current_price > sma_short > sma_long > sma_vlong:
            trend = "STRONG_UPTREND"
            signal = Signal.STRONG_BUY.value
        elif current_price > sma_short > sma_long:
            trend = "UPTREND"
            signal = Signal.BUY.value
        elif current_price > sma_short:
            trend = "WEAK_UPTREND"
            signal = Signal.NEUTRAL.value
        elif current_price < sma_short < sma_long < sma_vlong:
            trend = "STRONG_DOWNTREND"
            signal = Signal.STRONG_SELL.value
        elif current_price < sma_short < sma_long:
            trend = "DOWNTREND"
            signal = Signal.SELL.value
        else:
            trend = "CONSOLIDATION"
            signal = Signal.NEUTRAL.value

        return {
            "trend": trend,
            "signal": signal,
            "sma_20": round(sma_short.iloc[-1], 2),
            "sma_50": round(sma_long.iloc[-1], 2),
            "sma_200": round(sma_vlong.iloc[-1], 2),
            "ema_20": round(ema_short.iloc[-1], 2),
            "ema_50": round(ema_long.iloc[-1], 2),
            "current_price": round(current_price, 2),
            "explanation": f"{trend}: Price {current_price:.2f} vs SMA20 {sma_short.iloc[-1]:.2f}"
        }

    def find_support_resistance(self) -> Dict[str, List[float]]:
        """
        Find support and resistance levels using recent highs/lows
        """
        recent_high = self.df['high'].iloc[-50:].max()
        recent_low = self.df['low'].iloc[-50:].min()
        current_price = self.df['close'].iloc[-1]

        # Calculate levels
        level_1_above = recent_high
        level_2_above = recent_high + (recent_high - recent_low) * 0.5
        level_1_below = recent_low
        level_2_below = recent_low - (recent_high - recent_low) * 0.5

        return {
            "resistance_1": round(level_1_above, 2),
            "resistance_2": round(level_2_above, 2),
            "support_1": round(level_1_below, 2),
            "support_2": round(level_2_below, 2),
            "current_price": round(current_price, 2),
            "distance_to_resistance": round(((level_1_above - current_price) / current_price) * 100, 2),
            "distance_to_support": round(((current_price - level_1_below) / current_price) * 100, 2)
        }

    def analyze(self) -> Dict[str, Any]:
        """Complete technical analysis"""

        rsi = self.calculate_rsi()
        macd = self.calculate_macd()
        bb = self.calculate_bollinger_bands()
        atr = self.calculate_atr()
        stoch = self.calculate_stochastic()
        ma = self.calculate_moving_averages()
        sr = self.find_support_resistance()

        # Count signals
        signals = [rsi.signal, macd.signal, bb.signal, atr.signal, stoch.signal, ma['signal']]
        buy_signals = signals.count(Signal.BUY.value) + signals.count(Signal.STRONG_BUY.value)
        sell_signals = signals.count(Signal.SELL.value) + signals.count(Signal.STRONG_SELL.value)

        if buy_signals > sell_signals:
            overall_signal = Signal.BUY.value
        elif sell_signals > buy_signals:
            overall_signal = Signal.SELL.value
        else:
            overall_signal = Signal.NEUTRAL.value

        return {
            "overall_signal": overall_signal,
            "confidence": round((max(buy_signals, sell_signals) / 6.0), 2),
            "indicators": {
                "rsi": {
                    "value": rsi.value,
                    "signal": rsi.signal,
                    "explanation": rsi.explanation
                },
                "macd": {
                    "value": macd.value,
                    "signal": macd.signal,
                    "explanation": macd.explanation
                },
                "bollinger_bands": {
                    "value": bb.value,
                    "signal": bb.signal,
                    "explanation": bb.explanation
                },
                "atr": {
                    "value": atr.value,
                    "signal": atr.signal,
                    "explanation": atr.explanation
                },
                "stochastic": {
                    "value": stoch.value,
                    "signal": stoch.signal,
                    "explanation": stoch.explanation
                }
            },
            "trend": ma,
            "support_resistance": sr,
            "signal_count": {
                "buy": buy_signals,
                "sell": sell_signals,
                "total": len(signals)
            }
        }


def main():
    """Process input and output analysis"""
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        ohlcv_data = data.get('ohlcv_data', [])
        ticker = data.get('ticker', 'UNKNOWN')

        if not ohlcv_data:
            raise ValueError("No OHLCV data provided")

        analyzer = TechnicalAnalyzer(ohlcv_data)
        result = analyzer.analyze()

        output = {
            'ticker': ticker,
            'analysis': result,
            'timestamp': pd.Timestamp.now().isoformat()
        }

        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'status': 'failed'
        }, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
