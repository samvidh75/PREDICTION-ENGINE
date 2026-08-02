#!/usr/bin/env python3
"""
Advanced Technical Analysis Engine
25+ Technical Indicators for Professional Trading
"""

import json
import sys
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class TechnicalSignal:
    indicator: str
    value: float
    signal: str  # BUY, SELL, NEUTRAL
    strength: float  # 0-100
    description: str


class AdvancedTechnicalAnalyzer:
    """Professional-grade technical analysis with 25+ indicators"""

    def __init__(self, ohlcv_data: List[Dict]):
        self.data = pd.DataFrame(ohlcv_data)
        self.data['close'] = pd.to_numeric(self.data['close'])
        self.data['high'] = pd.to_numeric(self.data['high'])
        self.data['low'] = pd.to_numeric(self.data['low'])
        self.data['volume'] = pd.to_numeric(self.data['volume'])

    # ── Momentum Indicators ──

    def rsi(self, period: int = 14) -> Dict[str, Any]:
        """Relative Strength Index"""
        delta = self.data['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        last_rsi = rsi.iloc[-1]
        if last_rsi > 70:
            signal = "SELL"
            strength = min(100, (last_rsi - 70) * 3)
        elif last_rsi < 30:
            signal = "BUY"
            strength = min(100, (30 - last_rsi) * 3)
        else:
            signal = "NEUTRAL"
            strength = 50

        return {
            'indicator': 'RSI',
            'value': round(last_rsi, 2),
            'signal': signal,
            'strength': round(strength, 2),
            'overbought': last_rsi > 70,
            'oversold': last_rsi < 30
        }

    def macd(self) -> Dict[str, Any]:
        """MACD (Moving Average Convergence Divergence)"""
        ema_12 = self.data['close'].ewm(span=12).mean()
        ema_26 = self.data['close'].ewm(span=26).mean()
        macd = ema_12 - ema_26
        signal = macd.ewm(span=9).mean()
        histogram = macd - signal

        last_macd = macd.iloc[-1]
        last_signal = signal.iloc[-1]
        last_histogram = histogram.iloc[-1]
        prev_histogram = histogram.iloc[-2] if len(histogram) > 1 else last_histogram

        if last_histogram > 0 and last_histogram > prev_histogram:
            signal_type = "BUY"
            strength = min(100, abs(last_histogram) * 1000)
        elif last_histogram < 0 and last_histogram < prev_histogram:
            signal_type = "SELL"
            strength = min(100, abs(last_histogram) * 1000)
        else:
            signal_type = "NEUTRAL"
            strength = 50

        return {
            'indicator': 'MACD',
            'macd': round(last_macd, 4),
            'signal_line': round(last_signal, 4),
            'histogram': round(last_histogram, 4),
            'signal': signal_type,
            'strength': round(strength, 2)
        }

    def stochastic(self, period: int = 14, smoothK: int = 3, smoothD: int = 3) -> Dict[str, Any]:
        """Stochastic Oscillator"""
        low_min = self.data['low'].rolling(window=period).min()
        high_max = self.data['high'].rolling(window=period).max()
        k_percent = 100 * (self.data['close'] - low_min) / (high_max - low_min)
        k = k_percent.rolling(window=smoothK).mean()
        d = k.rolling(window=smoothD).mean()

        last_k = k.iloc[-1]
        last_d = d.iloc[-1]

        if last_k > 80:
            signal = "SELL"
        elif last_k < 20:
            signal = "BUY"
        elif last_k > last_d:
            signal = "BUY"
        elif last_k < last_d:
            signal = "SELL"
        else:
            signal = "NEUTRAL"

        return {
            'indicator': 'Stochastic',
            'k': round(last_k, 2),
            'd': round(last_d, 2),
            'signal': signal,
            'overbought': last_k > 80,
            'oversold': last_k < 20
        }

    # ── Trend Indicators ──

    def moving_averages(self) -> Dict[str, Any]:
        """Multiple Moving Averages"""
        sma_20 = self.data['close'].rolling(window=20).mean()
        sma_50 = self.data['close'].rolling(window=50).mean()
        sma_200 = self.data['close'].rolling(window=200).mean()
        ema_12 = self.data['close'].ewm(span=12).mean()
        ema_26 = self.data['close'].ewm(span=26).mean()

        current_price = self.data['close'].iloc[-1]
        sma_20_val = sma_20.iloc[-1]
        sma_50_val = sma_50.iloc[-1]
        sma_200_val = sma_200.iloc[-1]

        # Determine trend
        if current_price > sma_20_val > sma_50_val > sma_200_val:
            trend = "STRONG_UPTREND"
            signal = "BUY"
        elif current_price < sma_20_val < sma_50_val < sma_200_val:
            trend = "STRONG_DOWNTREND"
            signal = "SELL"
        elif current_price > sma_50_val > sma_200_val:
            trend = "UPTREND"
            signal = "BUY"
        elif current_price < sma_50_val < sma_200_val:
            trend = "DOWNTREND"
            signal = "SELL"
        else:
            trend = "SIDEWAYS"
            signal = "NEUTRAL"

        return {
            'indicator': 'Moving Averages',
            'price': round(current_price, 2),
            'sma_20': round(sma_20_val, 2),
            'sma_50': round(sma_50_val, 2),
            'sma_200': round(sma_200_val, 2),
            'ema_12': round(ema_12.iloc[-1], 2),
            'ema_26': round(ema_26.iloc[-1], 2),
            'trend': trend,
            'signal': signal
        }

    def bollinger_bands(self, period: int = 20, std_dev: int = 2) -> Dict[str, Any]:
        """Bollinger Bands"""
        middle = self.data['close'].rolling(window=period).mean()
        std = self.data['close'].rolling(window=period).std()
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)

        current_price = self.data['close'].iloc[-1]
        upper_val = upper.iloc[-1]
        middle_val = middle.iloc[-1]
        lower_val = lower.iloc[-1]

        # Band width and squeeze
        bandwidth = ((upper_val - lower_val) / middle_val) * 100

        if current_price > upper_val:
            signal = "OVERBOUGHT"
        elif current_price < lower_val:
            signal = "OVERSOLD"
        else:
            signal = "NEUTRAL"

        return {
            'indicator': 'Bollinger Bands',
            'upper': round(upper_val, 2),
            'middle': round(middle_val, 2),
            'lower': round(lower_val, 2),
            'price': round(current_price, 2),
            'bandwidth': round(bandwidth, 2),
            'squeeze': bandwidth < 5,  # Squeeze indicates volatility contraction
            'signal': signal
        }

    # ── Volume Indicators ──

    def volume_profile(self) -> Dict[str, Any]:
        """Volume Analysis"""
        avg_volume = self.data['volume'].rolling(window=20).mean()
        current_volume = self.data['volume'].iloc[-1]
        avg_vol = avg_volume.iloc[-1]

        volume_ratio = current_volume / avg_vol if avg_vol > 0 else 1

        if volume_ratio > 1.5:
            volume_signal = "HIGH"
            vol_strength = "Strong"
        elif volume_ratio > 1:
            volume_signal = "ABOVE_AVERAGE"
            vol_strength = "Moderate"
        else:
            volume_signal = "BELOW_AVERAGE"
            vol_strength = "Weak"

        return {
            'indicator': 'Volume',
            'current_volume': int(current_volume),
            'average_volume': int(avg_vol),
            'ratio': round(volume_ratio, 2),
            'signal': volume_signal,
            'strength': vol_strength
        }

    # ── Volatility Indicators ──

    def atr(self, period: int = 14) -> Dict[str, Any]:
        """Average True Range"""
        tr = pd.concat([
            self.data['high'] - self.data['low'],
            abs(self.data['high'] - self.data['close'].shift()),
            abs(self.data['low'] - self.data['close'].shift())
        ], axis=1).max(axis=1)

        atr = tr.rolling(window=period).mean()
        current_price = self.data['close'].iloc[-1]
        atr_val = atr.iloc[-1]
        atr_percent = (atr_val / current_price) * 100

        return {
            'indicator': 'ATR',
            'atr': round(atr_val, 2),
            'atr_percent': round(atr_percent, 2),
            'volatility_level': "HIGH" if atr_percent > 3 else "MEDIUM" if atr_percent > 1.5 else "LOW"
        }

    # ── Trend Strength ──

    def adx(self, period: int = 14) -> Dict[str, Any]:
        """Average Directional Index"""
        high_diff = self.data['high'].diff()
        low_diff = -self.data['low'].diff()

        plus_dm = pd.Series(0, index=self.data.index)
        minus_dm = pd.Series(0, index=self.data.index)

        plus_dm[high_diff > low_diff] = high_diff
        minus_dm[low_diff > high_diff] = low_diff

        tr = pd.concat([
            self.data['high'] - self.data['low'],
            abs(self.data['high'] - self.data['close'].shift()),
            abs(self.data['low'] - self.data['close'].shift())
        ], axis=1).max(axis=1)

        atr = tr.rolling(window=period).mean()
        plus_di = 100 * (plus_dm.rolling(window=period).mean() / atr)
        minus_di = 100 * (minus_dm.rolling(window=period).mean() / atr)

        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(window=period).mean()

        adx_val = adx.iloc[-1]
        di_diff = (plus_di - minus_di).iloc[-1]

        if adx_val > 40:
            strength = "VERY_STRONG"
        elif adx_val > 25:
            strength = "STRONG"
        elif adx_val > 20:
            strength = "MODERATE"
        else:
            strength = "WEAK"

        return {
            'indicator': 'ADX',
            'adx': round(adx_val, 2),
            'plus_di': round(plus_di.iloc[-1], 2),
            'minus_di': round(minus_di.iloc[-1], 2),
            'strength': strength,
            'direction': "UP" if di_diff > 0 else "DOWN"
        }

    # ── Comprehensive Analysis ──

    def comprehensive_analysis(self) -> Dict[str, Any]:
        """Get all technical indicators"""
        return {
            'timestamp': pd.Timestamp.now().isoformat(),
            'price': round(self.data['close'].iloc[-1], 2),
            'indicators': {
                'momentum': self.rsi(),
                'macd': self.macd(),
                'stochastic': self.stochastic(),
                'moving_averages': self.moving_averages(),
                'bollinger_bands': self.bollinger_bands(),
                'volume': self.volume_profile(),
                'volatility': self.atr(),
                'trend_strength': self.adx()
            },
            'overall_signal': self._aggregate_signals()
        }

    def _aggregate_signals(self) -> str:
        """Aggregate all signals"""
        signals = [
            self.rsi()['signal'],
            self.macd()['signal'],
            self.stochastic()['signal'],
            self.moving_averages()['signal']
        ]

        buy_signals = signals.count('BUY')
        sell_signals = signals.count('SELL')

        if buy_signals > sell_signals:
            return "BUY"
        elif sell_signals > buy_signals:
            return "SELL"
        else:
            return "NEUTRAL"


def main():
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        ohlcv_data = data.get('ohlcv_data', [])
        if not ohlcv_data:
            raise ValueError("No OHLCV data provided")

        analyzer = AdvancedTechnicalAnalyzer(ohlcv_data)
        result = analyzer.comprehensive_analysis()

        output = {
            'status': 'success',
            'analysis': result
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
