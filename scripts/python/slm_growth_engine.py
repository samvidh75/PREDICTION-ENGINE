"""
Growth Engine: Assesses revenue and profit growth trajectory.

Factors:
- Revenue CAGR (3-year)
- Profit CAGR (3-year)
- YoY growth rates
- EPS growth trajectory
"""

from typing import Dict


class GrowthEngine:
    def calculate_growth_score(self, fundamentals: Dict) -> Dict:
        revenue_cagr_3y = fundamentals.get('revenue_cagr_3y', 0)
        profit_cagr_3y = fundamentals.get('profit_cagr_3y', 0)
        revenue_growth_yoy = fundamentals.get('revenue_growth_yoy', 0)
        profit_growth_yoy = fundamentals.get('profit_growth_yoy', 0)
        eps_growth = fundamentals.get('eps_growth_yoy', 0)

        revenue_score = self._score_cagr(revenue_cagr_3y)
        profit_score = self._score_cagr(profit_cagr_3y, 'profit')

        yoy_score = self._score_yoy(revenue_growth_yoy, profit_growth_yoy)
        eps_score = self._score_eps_growth(eps_growth)

        growth_score = (
            revenue_score * 0.30
            + profit_score * 0.35
            + yoy_score * 0.20
            + eps_score * 0.15
        )

        return {
            'growth_score': int(growth_score),
            'revenue_cagr_score': revenue_score,
            'profit_cagr_score': profit_score,
            'yoy_score': yoy_score,
            'eps_score': eps_score,
            'components': {
                'revenue_cagr_3y': revenue_cagr_3y,
                'profit_cagr_3y': profit_cagr_3y,
                'revenue_growth_yoy': revenue_growth_yoy,
                'profit_growth_yoy': profit_growth_yoy,
                'eps_growth_yoy': eps_growth
            }
        }

    def _score_cagr(self, cagr: float, type: str = 'revenue') -> float:
        if type == 'revenue':
            thresholds = [0, 5, 10, 15, 20, 25]
            scores = [10, 30, 50, 70, 85, 100]
        else:
            thresholds = [0, 10, 15, 20, 25, 30]
            scores = [15, 35, 55, 75, 90, 100]

        for i, threshold in enumerate(thresholds):
            if cagr <= threshold:
                if i == 0:
                    return scores[0]
                return scores[i - 1] + (cagr - thresholds[i - 1]) / (threshold - thresholds[i - 1]) * (scores[i] - scores[i - 1])

        return 100

    def _score_yoy(self, rev_growth: float, profit_growth: float) -> float:
        combined = (rev_growth + profit_growth) / 2

        if combined < 0:
            return 10
        elif combined < 5:
            return 30
        elif combined < 10:
            return 50
        elif combined < 15:
            return 70
        elif combined < 20:
            return 85
        else:
            return 100

    def _score_eps_growth(self, eps: float) -> float:
        if eps < 0:
            return 10
        elif eps < 5:
            return 35
        elif eps < 10:
            return 55
        elif eps < 15:
            return 75
        else:
            return 95
