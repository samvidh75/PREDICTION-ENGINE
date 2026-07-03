"""
Momentum Engine: Assesses price trend and technical momentum.

Factors:
- RSI-14 (relative strength)
- MACD signal
- Price vs SMA-50 and SMA-200
- Short-term price trend (1m, 3m)
"""

from typing import Dict, List


class MomentumEngine:
    def calculate_momentum_score(self, fundamentals: Dict) -> Dict:
        rsi_14 = fundamentals.get('rsi_14', 50)
        sma_50 = fundamentals.get('sma_50', 0)
        sma_200 = fundamentals.get('sma_200', 0)
        price = fundamentals.get('price', 0)
        return_1m = fundamentals.get('return_1m', 0)
        return_3m = fundamentals.get('return_3m', 0)

        rsi_score = self._score_rsi(rsi_14)
        trend_score = self._score_trend(price, sma_50, sma_200)
        short_term_score = self._score_short_term(return_1m, return_3m)

        momentum_score = (
            rsi_score * 0.30
            + trend_score * 0.40
            + short_term_score * 0.30
        )

        return {
            'momentum_score': int(momentum_score),
            'rsi_score': rsi_score,
            'trend_score': trend_score,
            'short_term_score': short_term_score,
            'components': {
                'rsi_14': rsi_14,
                'price_vs_sma_50': f"{(price / sma_50 - 1) * 100:.1f}%" if sma_50 else 'N/A',
                'price_vs_sma_200': f"{(price / sma_200 - 1) * 100:.1f}%" if sma_200 else 'N/A',
                'return_1m': return_1m,
                'return_3m': return_3m
            }
        }

    def _score_rsi(self, rsi: float) -> float:
        if rsi < 30:
            return 20
        elif rsi < 40:
            return 40
        elif rsi < 50:
            return 60
        elif rsi < 60:
            return 75
        elif rsi < 70:
            return 85
        else:
            return 60

    def _score_trend(self, price: float, sma_50: float, sma_200: float) -> float:
        if sma_50 <= 0 or sma_200 <= 0:
            return 50

        above_sma_50 = price > sma_50
        above_sma_200 = price > sma_200

        sma_50_premium = (price / sma_50 - 1) * 100
        sma_200_premium = (price / sma_200 - 1) * 100

        if above_sma_50 and above_sma_200 and sma_50 > sma_200:
            return 100
        elif above_sma_50 and above_sma_200:
            return 85
        elif above_sma_50:
            return 70
        elif above_sma_200:
            return 55
        elif sma_50 > sma_200:
            return 40
        else:
            return 20

    def _score_short_term(self, return_1m: float, return_3m: float) -> float:
        avg_return = (return_1m + return_3m) / 2

        if avg_return > 15:
            return 90
        elif avg_return > 10:
            return 75
        elif avg_return > 5:
            return 60
        elif avg_return > 0:
            return 50
        elif avg_return > -5:
            return 35
        elif avg_return > -10:
            return 20
        else:
            return 10
