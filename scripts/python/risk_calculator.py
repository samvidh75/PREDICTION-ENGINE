#!/usr/bin/env python3
"""
Risk Calculator
Advanced risk metrics for portfolio and individual stocks
"""

import json
import sys
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy import stats


class RiskCalculator:
    """Calculate comprehensive risk metrics"""

    def __init__(self, returns: np.ndarray, risk_free_rate: float = 0.06):
        """
        Initialize with returns data
        returns: array of daily returns
        risk_free_rate: annual risk-free rate (default 6%)
        """
        self.returns = np.array(returns)
        self.risk_free_rate = risk_free_rate
        self.daily_rf = (1 + risk_free_rate) ** (1/252) - 1

    def calculate_volatility(self) -> Dict[str, float]:
        """Calculate annualized volatility"""
        daily_vol = np.std(self.returns)
        annual_vol = daily_vol * np.sqrt(252)

        return {
            "daily_volatility": round(daily_vol, 4),
            "annual_volatility": round(annual_vol, 4),
            "interpretation": "Price swing magnitude (annualized)"
        }

    def calculate_var(self, confidence: float = 0.95) -> Dict[str, float]:
        """
        Value at Risk (VaR)
        Maximum expected loss at given confidence level
        """
        var = np.percentile(self.returns, (1 - confidence) * 100)

        return {
            "var_95": round(var, 4),
            "interpretation": f"95% confidence: max daily loss is {var*100:.2f}%",
            "annual_var": round(var * np.sqrt(252), 4)
        }

    def calculate_cvar(self, confidence: float = 0.95) -> Dict[str, float]:
        """
        Conditional Value at Risk (CVaR / Expected Shortfall)
        Average loss beyond VaR threshold
        """
        var = np.percentile(self.returns, (1 - confidence) * 100)
        cvar = self.returns[self.returns <= var].mean()

        return {
            "cvar_95": round(cvar, 4),
            "interpretation": f"Average loss in worst 5% of days: {cvar*100:.2f}%",
            "annual_cvar": round(cvar * np.sqrt(252), 4)
        }

    def calculate_sharpe_ratio(self) -> Dict[str, float]:
        """
        Sharpe Ratio
        Return per unit of risk
        >1: Good, >2: Excellent, >3: Exceptional
        """
        annual_return = (1 + self.returns.mean()) ** 252 - 1
        annual_vol = np.std(self.returns) * np.sqrt(252)

        sharpe = (annual_return - self.risk_free_rate) / annual_vol

        if sharpe > 3:
            rating = "Exceptional"
        elif sharpe > 2:
            rating = "Excellent"
        elif sharpe > 1:
            rating = "Good"
        else:
            rating = "Below Average"

        return {
            "sharpe_ratio": round(sharpe, 2),
            "annual_return": round(annual_return, 4),
            "annual_volatility": round(annual_vol, 4),
            "rating": rating,
            "interpretation": f"Earning {sharpe:.2f} units of return per unit of risk"
        }

    def calculate_sortino_ratio(self) -> Dict[str, float]:
        """
        Sortino Ratio
        Like Sharpe, but only penalizes downside volatility
        Usually higher than Sharpe ratio
        """
        annual_return = (1 + self.returns.mean()) ** 252 - 1
        downside_returns = self.returns[self.returns < self.daily_rf]
        downside_vol = np.std(downside_returns) * np.sqrt(252)

        if downside_vol == 0:
            sortino = 0
        else:
            sortino = (annual_return - self.risk_free_rate) / downside_vol

        return {
            "sortino_ratio": round(sortino, 2),
            "downside_volatility": round(downside_vol, 4),
            "interpretation": f"Return per unit of downside risk: {sortino:.2f}",
            "vs_sharpe": "Sortino ignores upside volatility (favorable skewness)"
        }

    def calculate_max_drawdown(self) -> Dict[str, float]:
        """
        Maximum Drawdown
        Largest peak-to-trough decline
        """
        cumulative = np.cumprod(1 + self.returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_dd = np.min(drawdown)

        return {
            "max_drawdown": round(max_dd, 4),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "interpretation": f"Largest peak-to-trough decline: {max_dd*100:.2f}%",
            "recovery_days": int(np.sum(cumulative == running_max))
        }

    def calculate_beta(self, market_returns: np.ndarray) -> Dict[str, float]:
        """
        Beta
        Systematic risk vs market
        Beta = 1: Moves with market
        Beta > 1: More volatile than market
        Beta < 1: Less volatile than market
        """
        market_returns = np.array(market_returns)
        covariance = np.cov(self.returns, market_returns)[0][1]
        market_variance = np.var(market_returns)

        beta = covariance / market_variance

        if beta > 1.2:
            risk_profile = "Aggressive (High Beta)"
        elif beta > 0.8:
            risk_profile = "Moderate (Market-correlated)"
        else:
            risk_profile = "Defensive (Low Beta)"

        return {
            "beta": round(beta, 2),
            "risk_profile": risk_profile,
            "interpretation": f"Stock is {beta:.1f}x as volatile as market"
        }

    def calculate_alpha(self, market_returns: np.ndarray, beta: float) -> Dict[str, float]:
        """
        Alpha
        Risk-adjusted excess return vs market
        >0: Outperforming market, <0: Underperforming
        """
        market_returns = np.array(market_returns)
        annual_return = (1 + self.returns.mean()) ** 252 - 1
        market_return = (1 + market_returns.mean()) ** 252 - 1

        alpha = annual_return - (self.risk_free_rate + beta * (market_return - self.risk_free_rate))

        return {
            "alpha": round(alpha, 4),
            "alpha_pct": round(alpha * 100, 2),
            "interpretation": f"Excess return after adjusting for risk: {alpha*100:.2f}%"
        }

    def calculate_skewness_kurtosis(self) -> Dict[str, float]:
        """
        Skewness & Kurtosis
        Skewness: Distribution shape (negative = left tail risk)
        Kurtosis: Tail heaviness (high = crash risk)
        """
        skew = stats.skew(self.returns)
        kurt = stats.kurtosis(self.returns)

        if skew < -0.5:
            skew_interpretation = "Negative skew: Crash risk"
        elif skew > 0.5:
            skew_interpretation = "Positive skew: Upside potential"
        else:
            skew_interpretation = "Neutral skew"

        if kurt > 3:
            kurt_interpretation = "High kurtosis: Extreme events likely"
        else:
            kurt_interpretation = "Normal kurtosis"

        return {
            "skewness": round(skew, 3),
            "kurtosis": round(kurt, 3),
            "skew_interpretation": skew_interpretation,
            "kurtosis_interpretation": kurt_interpretation
        }

    def calculate_calmar_ratio(self) -> Dict[str, float]:
        """
        Calmar Ratio
        Annual return / Max Drawdown
        Higher is better
        """
        annual_return = (1 + self.returns.mean()) ** 252 - 1

        cumulative = np.cumprod(1 + self.returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_dd = abs(np.min(drawdown))

        if max_dd == 0:
            calmar = 0
        else:
            calmar = annual_return / max_dd

        return {
            "calmar_ratio": round(calmar, 2),
            "annual_return": round(annual_return, 4),
            "max_drawdown": round(max_dd, 4),
            "interpretation": "Return generated per unit of downside risk"
        }

    def monte_carlo_simulation(self, days: int = 252, simulations: int = 1000) -> Dict[str, Any]:
        """
        Monte Carlo Simulation
        Project future returns based on historical distribution
        """
        mean_return = self.returns.mean()
        std_return = np.std(self.returns)

        simulated_paths = np.zeros((simulations, days))

        for i in range(simulations):
            daily_returns = np.random.normal(mean_return, std_return, days)
            simulated_paths[i] = daily_returns

        cumulative_returns = np.cumprod(1 + simulated_paths, axis=1) - 1
        final_returns = cumulative_returns[:, -1]

        return {
            "mean_return": round(np.mean(final_returns), 4),
            "std_dev": round(np.std(final_returns), 4),
            "percentile_5": round(np.percentile(final_returns, 5), 4),
            "percentile_25": round(np.percentile(final_returns, 25), 4),
            "percentile_75": round(np.percentile(final_returns, 75), 4),
            "percentile_95": round(np.percentile(final_returns, 95), 4),
            "best_case": round(np.max(final_returns), 4),
            "worst_case": round(np.min(final_returns), 4),
            "confidence_interval_95": [
                round(np.percentile(final_returns, 2.5), 4),
                round(np.percentile(final_returns, 97.5), 4)
            ]
        }

    def analyze(self, market_returns: List[float] = None) -> Dict[str, Any]:
        """Complete risk analysis"""

        volatility = self.calculate_volatility()
        var = self.calculate_var()
        cvar = self.calculate_cvar()
        sharpe = self.calculate_sharpe_ratio()
        sortino = self.calculate_sortino_ratio()
        max_dd = self.calculate_max_drawdown()
        skew_kurt = self.calculate_skewness_kurtosis()
        calmar = self.calculate_calmar_ratio()
        monte_carlo = self.monte_carlo_simulation()

        beta_result = None
        alpha_result = None

        if market_returns:
            market_returns = np.array(market_returns)
            beta_result = self.calculate_beta(market_returns)
            alpha_result = self.calculate_alpha(market_returns, beta_result['beta'])

        # Risk rating
        if sharpe['sharpe_ratio'] > 2:
            risk_rating = "EXCELLENT"
        elif sharpe['sharpe_ratio'] > 1:
            risk_rating = "GOOD"
        elif sharpe['sharpe_ratio'] > 0:
            risk_rating = "AVERAGE"
        else:
            risk_rating = "POOR"

        return {
            "overall_risk_rating": risk_rating,
            "metrics": {
                "volatility": volatility,
                "value_at_risk": var,
                "conditional_var": cvar,
                "sharpe_ratio": sharpe,
                "sortino_ratio": sortino,
                "calmar_ratio": calmar,
                "max_drawdown": max_dd,
                "skewness_kurtosis": skew_kurt,
                "beta": beta_result,
                "alpha": alpha_result
            },
            "monte_carlo": monte_carlo,
            "recommendations": self._generate_recommendations(sharpe, max_dd, skew_kurt)
        }

    def _generate_recommendations(self, sharpe, max_dd, skew_kurt) -> List[str]:
        """Generate risk management recommendations"""
        recommendations = []

        if sharpe['sharpe_ratio'] < 1:
            recommendations.append("Sharpe ratio below 1: Review risk-adjusted returns")

        if max_dd['max_drawdown'] < -0.30:
            recommendations.append("Max drawdown exceeds 30%: Consider risk reduction")

        if skew_kurt['skewness'] < -0.5:
            recommendations.append("Negative skew detected: Implement hedging strategy")

        if skew_kurt['kurtosis'] > 3:
            recommendations.append("High kurtosis: Tail risk present, use stop-losses")

        if not recommendations:
            recommendations.append("Risk profile appears acceptable")

        return recommendations


def main():
    """Process input and output analysis"""
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        returns = data.get('returns', [])
        ticker = data.get('ticker', 'UNKNOWN')
        risk_free_rate = data.get('risk_free_rate', 0.06)
        market_returns = data.get('market_returns')

        if not returns:
            raise ValueError("No returns data provided")

        calculator = RiskCalculator(returns, risk_free_rate)
        result = calculator.analyze(market_returns)

        output = {
            'ticker': ticker,
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
