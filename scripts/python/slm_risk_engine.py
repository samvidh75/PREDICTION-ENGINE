"""
Risk Engine: Assesses financial and market risk.

Factors:
- Leverage (debt-to-equity)
- Volatility (30-day)
- Drawdown (52-week max)
- Interest coverage
- Current ratio (liquidity)
"""

from typing import Dict


class RiskEngine:
    def calculate_risk_score(self, fundamentals: Dict) -> Dict:
        debt_to_equity = fundamentals.get('debt_to_equity', 0)
        volatility = fundamentals.get('volatility_30d', 0)
        max_drawdown = fundamentals.get('max_drawdown_52w', 0)
        interest_coverage = fundamentals.get('interest_coverage', 0)
        current_ratio = fundamentals.get('current_ratio', 0)

        leverage_risk = self._score_leverage(debt_to_equity)
        volatility_risk = self._score_volatility(volatility)
        drawdown_risk = self._score_drawdown(max_drawdown)
        interest_risk = self._score_interest_coverage(interest_coverage)
        liquidity_risk = self._score_current_ratio(current_ratio)

        risk_score = (
            leverage_risk * 0.30
            + volatility_risk * 0.25
            + drawdown_risk * 0.20
            + interest_risk * 0.15
            + liquidity_risk * 0.10
        )

        return {
            'risk_score': int(risk_score),
            'leverage_risk': leverage_risk,
            'volatility_risk': volatility_risk,
            'drawdown_risk': drawdown_risk,
            'interest_risk': interest_risk,
            'liquidity_risk': liquidity_risk,
            'risk_level': self._classify_risk(risk_score),
            'components': {
                'debt_to_equity': debt_to_equity,
                'volatility_30d': volatility,
                'max_drawdown_52w': max_drawdown,
                'interest_coverage': interest_coverage,
                'current_ratio': current_ratio
            }
        }

    def _score_leverage(self, d_e: float) -> float:
        if d_e < 0.5:
            return 10
        elif d_e < 1.0:
            return 30
        elif d_e < 2.0:
            return 55
        elif d_e < 3.0:
            return 75
        else:
            return 90

    def _score_volatility(self, vol: float) -> float:
        if vol < 15:
            return 15
        elif vol < 25:
            return 35
        elif vol < 35:
            return 60
        elif vol < 50:
            return 80
        else:
            return 95

    def _score_drawdown(self, dd: float) -> float:
        if dd < 10:
            return 15
        elif dd < 20:
            return 35
        elif dd < 35:
            return 60
        elif dd < 50:
            return 80
        else:
            return 95

    def _score_interest_coverage(self, ic: float) -> float:
        if ic < 2:
            return 85
        elif ic < 3:
            return 65
        elif ic < 5:
            return 40
        elif ic < 10:
            return 20
        else:
            return 5

    def _score_current_ratio(self, cr: float) -> float:
        if cr < 1.0:
            return 80
        elif cr < 1.5:
            return 50
        elif cr < 2.0:
            return 25
        else:
            return 10

    def _classify_risk(self, score: float) -> str:
        if score < 25:
            return 'LOW'
        elif score < 45:
            return 'MODERATE'
        elif score < 65:
            return 'ELEVATED'
        elif score < 80:
            return 'HIGH'
        else:
            return 'DANGEROUS'
