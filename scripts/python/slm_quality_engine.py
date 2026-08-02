"""
Quality Engine: Assesses business quality metrics.

Factors:
- ROE (Return on Equity): Profitability relative to shareholder capital
- ROIC (Return on Invested Capital): Efficiency of capital deployment
- Operating Margin: Cost structure efficiency
- Asset Turnover: Revenue generation per rupee of assets
- Debt-to-Equity: Capital structure health
"""

import numpy as np
from typing import Dict, List


class QualityEngine:
    def __init__(self):
        self.roe_threshold = 15
        self.roic_threshold = 13
        self.op_margin_threshold = 10
        self.consistency_window = 5

    def calculate_quality_score(self, fundamentals: Dict) -> Dict:
        roe = fundamentals.get('roe', 0)
        roe_score = self._score_roe(roe)

        roic = fundamentals.get('roic', 0)
        roic_score = self._score_roic(roic)

        op_margin = fundamentals.get('operating_margin', 0)
        op_margin_score = self._score_op_margin(op_margin)

        roe_history = fundamentals.get('roe_history', [])
        consistency_score = self._score_consistency(roe_history)

        asset_turnover = fundamentals.get('asset_turnover', 0)
        turnover_score = self._score_asset_turnover(asset_turnover)

        quality_score = (
            roe_score * 0.35
            + roic_score * 0.30
            + op_margin_score * 0.20
            + consistency_score * 0.10
            + turnover_score * 0.05
        )

        return {
            'quality_score': int(quality_score),
            'roe_score': roe_score,
            'roic_score': roic_score,
            'op_margin_score': op_margin_score,
            'consistency_score': consistency_score,
            'turnover_score': turnover_score,
            'components': {
                'roe': roe,
                'roic': roic,
                'operating_margin': op_margin,
                'asset_turnover': asset_turnover,
                'roe_consistency_cv': self._cv(roe_history)
            }
        }

    def _score_roe(self, roe: float) -> float:
        if roe < 5:
            return 0
        elif roe < 10:
            return 25 + (roe - 5) / 5 * 25
        elif roe < 15:
            return 50 + (roe - 10) / 5 * 25
        elif roe < 20:
            return 75 + (roe - 15) / 5 * 25
        else:
            return min(100, 100 + (roe - 20) / 5 * 5)

    def _score_roic(self, roic: float) -> float:
        if roic < 5:
            return 0
        elif roic < 10:
            return 30 + (roic - 5) / 5 * 20
        elif roic < 13:
            return 50 + (roic - 10) / 3 * 25
        elif roic < 18:
            return 75 + (roic - 13) / 5 * 25
        else:
            return min(100, 100 + (roic - 18) / 5 * 5)

    def _score_op_margin(self, op_margin: float) -> float:
        if op_margin < 5:
            return 20
        elif op_margin < 10:
            return 40 + (op_margin - 5) / 5 * 20
        elif op_margin < 15:
            return 60 + (op_margin - 10) / 5 * 20
        elif op_margin < 20:
            return 80 + (op_margin - 15) / 5 * 15
        else:
            return min(100, 95 + (op_margin - 20) / 10 * 5)

    def _score_consistency(self, roe_history: List[float]) -> float:
        if not roe_history or len(roe_history) < 2:
            return 50

        mean = np.mean(roe_history)
        std = np.std(roe_history)
        cv = std / mean if mean > 0 else 1

        if cv < 0.15:
            return 95
        elif cv < 0.25:
            return 80
        elif cv < 0.35:
            return 65
        elif cv < 0.50:
            return 50
        else:
            return 30

    def _score_asset_turnover(self, turnover: float) -> float:
        if turnover < 0.5:
            return 20
        elif turnover < 1.0:
            return 40 + (turnover - 0.5) / 0.5 * 20
        elif turnover < 1.5:
            return 60 + (turnover - 1.0) / 0.5 * 20
        else:
            return min(100, 80 + (turnover - 1.5) / 1.0 * 20)

    def _cv(self, data: List[float]) -> float:
        if not data or len(data) < 2:
            return 0
        mean = np.mean(data)
        if mean == 0:
            return float('inf')
        return np.std(data) / mean
