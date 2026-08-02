#!/usr/bin/env python3
"""
Portfolio Optimizer
Efficient frontier calculation & optimal allocation
"""

import json
import sys
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class Portfolio:
    weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float


class PortfolioOptimizer:
    """Optimize portfolio allocations"""

    def __init__(self, returns_data: Dict[str, List[float]], risk_free_rate: float = 0.06):
        self.returns = pd.DataFrame(returns_data)
        self.risk_free_rate = risk_free_rate
        self.cov_matrix = self.returns.cov() * 252  # Annualized
        self.mean_returns = self.returns.mean() * 252

    def calculate_portfolio_metrics(self, weights: np.ndarray) -> Dict[str, float]:
        """Calculate portfolio return, volatility, sharpe"""
        portfolio_return = np.sum(self.mean_returns * weights)
        portfolio_std = np.sqrt(np.dot(weights, np.dot(self.cov_matrix, weights)))
        sharpe = (portfolio_return - self.risk_free_rate) / portfolio_std if portfolio_std > 0 else 0

        return {
            'return': portfolio_return,
            'volatility': portfolio_std,
            'sharpe': sharpe
        }

    def maximum_sharpe_portfolio(self) -> Portfolio:
        """Find portfolio with maximum Sharpe ratio"""
        num_assets = len(self.returns.columns)
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1},)
        bounds = tuple((0, 1) for _ in range(num_assets))
        x0 = np.array([1 / num_assets] * num_assets)

        # Simple optimization (gradient-free for demo)
        best_sharpe = -np.inf
        best_weights = x0

        # Monte Carlo simulation of portfolios
        for _ in range(10000):
            weights = np.random.random(num_assets)
            weights /= weights.sum()

            metrics = self.calculate_portfolio_metrics(weights)
            if metrics['sharpe'] > best_sharpe:
                best_sharpe = metrics['sharpe']
                best_weights = weights

        metrics = self.calculate_portfolio_metrics(best_weights)
        return Portfolio(
            weights={col: round(w, 4) for col, w in zip(self.returns.columns, best_weights)},
            expected_return=round(metrics['return'], 4),
            volatility=round(metrics['volatility'], 4),
            sharpe_ratio=round(metrics['sharpe'], 2),
            max_drawdown=-0.15  # Placeholder
        )

    def minimum_variance_portfolio(self) -> Portfolio:
        """Find portfolio with minimum volatility"""
        num_assets = len(self.returns.columns)
        best_vol = np.inf
        best_weights = np.array([1 / num_assets] * num_assets)

        # Monte Carlo search
        for _ in range(10000):
            weights = np.random.random(num_assets)
            weights /= weights.sum()

            metrics = self.calculate_portfolio_metrics(weights)
            if metrics['volatility'] < best_vol:
                best_vol = metrics['volatility']
                best_weights = weights

        metrics = self.calculate_portfolio_metrics(best_weights)
        return Portfolio(
            weights={col: round(w, 4) for col, w in zip(self.returns.columns, best_weights)},
            expected_return=round(metrics['return'], 4),
            volatility=round(metrics['volatility'], 4),
            sharpe_ratio=round(metrics['sharpe'], 2),
            max_drawdown=-0.12
        )

    def equal_weight_portfolio(self) -> Portfolio:
        """Equal-weighted portfolio (1/N rule)"""
        num_assets = len(self.returns.columns)
        weights = np.array([1 / num_assets] * num_assets)
        metrics = self.calculate_portfolio_metrics(weights)

        return Portfolio(
            weights={col: round(1/num_assets, 4) for col in self.returns.columns},
            expected_return=round(metrics['return'], 4),
            volatility=round(metrics['volatility'], 4),
            sharpe_ratio=round(metrics['sharpe'], 2),
            max_drawdown=-0.18
        )

    def risk_parity_portfolio(self) -> Portfolio:
        """Risk parity: equal risk contribution"""
        num_assets = len(self.returns.columns)
        std_devs = np.sqrt(np.diag(self.cov_matrix))

        # Risk parity: weight inverse to volatility
        weights = (1 / std_devs) / (1 / std_devs).sum()

        metrics = self.calculate_portfolio_metrics(weights)
        return Portfolio(
            weights={col: round(w, 4) for col, w in zip(self.returns.columns, weights)},
            expected_return=round(metrics['return'], 4),
            volatility=round(metrics['volatility'], 4),
            sharpe_ratio=round(metrics['sharpe'], 2),
            max_drawdown=-0.14
        )

    def efficient_frontier(self, num_portfolios: int = 10000) -> List[Dict[str, float]]:
        """Generate efficient frontier"""
        results = []
        num_assets = len(self.returns.columns)

        for _ in range(num_portfolios):
            weights = np.random.random(num_assets)
            weights /= weights.sum()

            metrics = self.calculate_portfolio_metrics(weights)
            results.append({
                'return': round(metrics['return'], 4),
                'volatility': round(metrics['volatility'], 4),
                'sharpe': round(metrics['sharpe'], 2)
            })

        return sorted(results, key=lambda x: x['return'])

    def recommend_allocation(self, current_portfolio: Dict[str, float]) -> Dict[str, Any]:
        """Recommend optimal allocation changes"""
        # Calculate current metrics
        current_weights = np.array(list(current_portfolio.values()))
        current_metrics = self.calculate_portfolio_metrics(current_weights)

        # Get optimal
        optimal = self.maximum_sharpe_portfolio()

        # Recommendations
        changes = {}
        for asset in self.returns.columns:
            current_w = current_portfolio.get(asset, 0)
            optimal_w = optimal.weights[asset]
            change = optimal_w - current_w

            if abs(change) > 0.02:  # Only if > 2% change
                changes[asset] = {
                    'current': round(current_w, 2),
                    'recommended': round(optimal_w, 2),
                    'change': round(change, 2),
                    'action': 'BUY' if change > 0 else 'SELL'
                }

        return {
            'current_portfolio': {
                'return': round(current_metrics['return'], 4),
                'volatility': round(current_metrics['volatility'], 4),
                'sharpe': round(current_metrics['sharpe'], 2)
            },
            'optimal_portfolio': {
                'return': optimal.expected_return,
                'volatility': optimal.volatility,
                'sharpe': optimal.sharpe_ratio
            },
            'improvements': {
                'return_increase': round(optimal.expected_return - current_metrics['return'], 4),
                'volatility_decrease': round(current_metrics['volatility'] - optimal.volatility, 4),
                'sharpe_improvement': round(optimal.sharpe_ratio - current_metrics['sharpe'], 2)
            },
            'recommended_changes': changes,
            'rebalancing_frequency': 'QUARTERLY'
        }

    def optimize(self) -> Dict[str, Any]:
        """Complete optimization analysis"""
        max_sharpe = self.maximum_sharpe_portfolio()
        min_var = self.minimum_variance_portfolio()
        equal = self.equal_weight_portfolio()
        risk_parity = self.risk_parity_portfolio()
        frontier = self.efficient_frontier()

        return {
            'maximum_sharpe_portfolio': {
                'weights': max_sharpe.weights,
                'expected_return': max_sharpe.expected_return,
                'volatility': max_sharpe.volatility,
                'sharpe_ratio': max_sharpe.sharpe_ratio,
                'recommendation': 'Best risk-adjusted returns'
            },
            'minimum_variance_portfolio': {
                'weights': min_var.weights,
                'expected_return': min_var.expected_return,
                'volatility': min_var.volatility,
                'sharpe_ratio': min_var.sharpe_ratio,
                'recommendation': 'Lowest risk (conservative)'
            },
            'equal_weight_portfolio': {
                'weights': equal.weights,
                'expected_return': equal.expected_return,
                'volatility': equal.volatility,
                'sharpe_ratio': equal.sharpe_ratio,
                'recommendation': 'Baseline (1/N strategy)'
            },
            'risk_parity_portfolio': {
                'weights': risk_parity.weights,
                'expected_return': risk_parity.expected_return,
                'volatility': risk_parity.volatility,
                'sharpe_ratio': risk_parity.sharpe_ratio,
                'recommendation': 'Equal risk contribution'
            },
            'efficient_frontier_points': frontier[:100],
            'best_portfolio': 'maximum_sharpe_portfolio',
            'rebalancing_schedule': 'QUARTERLY'
        }


def main():
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        returns_data = data.get('returns_data', {})
        risk_free_rate = data.get('risk_free_rate', 0.06)

        if not returns_data:
            raise ValueError("No returns data provided")

        optimizer = PortfolioOptimizer(returns_data, risk_free_rate)
        result = optimizer.optimize()

        output = {
            'optimization': result,
            'status': 'success'
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
