#!/usr/bin/env python3
"""
Stock Health Calculator
Accurate health score calculation using financial metrics and proper formulas
0-100 scale with detailed component breakdown
"""

import json
import sys
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum


class ScoreBand(Enum):
    """Health score classification bands"""
    EXCELLENT = (80, 100, "Excellent")
    VERY_GOOD = (70, 79, "Very Good")
    GOOD = (60, 69, "Good")
    SATISFACTORY = (50, 59, "Satisfactory")
    FAIR = (40, 49, "Fair")
    POOR = (30, 39, "Poor")
    CRITICAL = (0, 29, "Critical")


@dataclass
class MetricScore:
    """Single metric score with weight"""
    name: str
    score: float  # 0-100
    weight: float  # 0-1
    component: str
    explanation: str


@dataclass
class HealthReport:
    """Complete health score report"""
    ticker: str
    overall_score: float
    band: str
    components: Dict[str, float]
    metrics: List[MetricScore]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    data_quality: float  # 0-100, confidence in score


class HealthCalculator:
    """Calculates accurate health scores from financial metrics"""

    def __init__(self):
        self.component_weights = {
            'valuation': 0.20,
            'financial_health': 0.25,
            'profitability': 0.20,
            'growth': 0.15,
            'momentum': 0.10,
            'risk': 0.10
        }

    def calculate_valuation_score(self, data: Dict[str, Any]) -> Tuple[float, List[MetricScore]]:
        """
        Calculate valuation score (0-100)
        Uses P/E, P/B, PEG ratio, dividend yield
        """
        metrics = []
        scores = []

        # P/E Ratio Score
        pe_ratio = data.get('pe_ratio')
        if pe_ratio and pe_ratio > 0:
            if pe_ratio < 15:
                pe_score = 80
                explanation = "Undervalued (P/E < 15)"
            elif pe_ratio < 20:
                pe_score = 70
                explanation = "Fair valuation (P/E 15-20)"
            elif pe_ratio < 25:
                pe_score = 60
                explanation = "Moderate valuation (P/E 20-25)"
            else:
                pe_score = max(30, 100 - (pe_ratio - 25) * 2)
                explanation = f"Expensive (P/E {pe_ratio:.1f})"

            metrics.append(MetricScore(
                name="P/E Ratio",
                score=pe_score,
                weight=0.35,
                component="valuation",
                explanation=explanation
            ))
            scores.append((pe_score, 0.35))

        # P/B Ratio Score
        pb_ratio = data.get('pb_ratio')
        if pb_ratio and pb_ratio > 0:
            if pb_ratio < 1.0:
                pb_score = 85
                explanation = "Deep value (P/B < 1.0)"
            elif pb_ratio < 1.5:
                pb_score = 75
                explanation = "Reasonable valuation (P/B < 1.5)"
            elif pb_ratio < 2.0:
                pb_score = 65
                explanation = "Moderate premium (P/B < 2.0)"
            else:
                pb_score = max(40, 100 - (pb_ratio - 2.0) * 10)
                explanation = f"High premium (P/B {pb_ratio:.1f})"

            metrics.append(MetricScore(
                name="P/B Ratio",
                score=pb_score,
                weight=0.30,
                component="valuation",
                explanation=explanation
            ))
            scores.append((pb_score, 0.30))

        # Dividend Yield Score
        div_yield = data.get('dividend_yield', 0)
        if div_yield >= 0:
            if div_yield >= 4:
                div_score = 85
                explanation = "Excellent yield (>4%)"
            elif div_yield >= 2.5:
                div_score = 75
                explanation = "Good yield (2.5-4%)"
            elif div_yield >= 1.5:
                div_score = 65
                explanation = "Moderate yield (1.5-2.5%)"
            elif div_yield >= 0.5:
                div_score = 55
                explanation = "Low yield (0.5-1.5%)"
            else:
                div_score = 45
                explanation = "No/minimal dividend"

            metrics.append(MetricScore(
                name="Dividend Yield",
                score=div_score,
                weight=0.35,
                component="valuation",
                explanation=explanation
            ))
            scores.append((div_score, 0.35))

        # Calculate weighted average
        if not scores:
            return 50.0, metrics

        total_score = sum(s * w for s, w in scores) / sum(w for _, w in scores)
        return min(100, max(0, total_score)), metrics

    def calculate_financial_health_score(self, data: Dict[str, Any]) -> Tuple[float, List[MetricScore]]:
        """
        Calculate financial health score (0-100)
        Uses debt-to-equity, current ratio, quick ratio, cash flow
        """
        metrics = []
        scores = []

        # Debt-to-Equity Score
        debt_equity = data.get('debt_to_equity', 0)
        if debt_equity >= 0:
            if debt_equity < 0.5:
                de_score = 90
                explanation = "Very low leverage (<0.5)"
            elif debt_equity < 1.0:
                de_score = 80
                explanation = "Conservative leverage (0.5-1.0)"
            elif debt_equity < 1.5:
                de_score = 70
                explanation = "Moderate leverage (1.0-1.5)"
            elif debt_equity < 2.0:
                de_score = 60
                explanation = "Elevated leverage (1.5-2.0)"
            else:
                de_score = max(30, 100 - (debt_equity - 2.0) * 15)
                explanation = f"High leverage ({debt_equity:.1f})"

            metrics.append(MetricScore(
                name="Debt-to-Equity",
                score=de_score,
                weight=0.40,
                component="financial_health",
                explanation=explanation
            ))
            scores.append((de_score, 0.40))

        # Current Ratio Score
        current_ratio = data.get('current_ratio', 0)
        if current_ratio > 0:
            if current_ratio >= 2.0:
                cr_score = 85
                explanation = "Excellent liquidity (>2.0)"
            elif current_ratio >= 1.5:
                cr_score = 75
                explanation = "Good liquidity (1.5-2.0)"
            elif current_ratio >= 1.0:
                cr_score = 65
                explanation = "Adequate liquidity (1.0-1.5)"
            elif current_ratio >= 0.8:
                cr_score = 50
                explanation = "Tight liquidity (0.8-1.0)"
            else:
                cr_score = max(20, 100 - (1.0 - current_ratio) * 100)
                explanation = f"Poor liquidity ({current_ratio:.2f})"

            metrics.append(MetricScore(
                name="Current Ratio",
                score=cr_score,
                weight=0.35,
                component="financial_health",
                explanation=explanation
            ))
            scores.append((cr_score, 0.35))

        # Interest Coverage Ratio Score
        interest_coverage = data.get('interest_coverage_ratio', 0)
        if interest_coverage and interest_coverage > 0:
            if interest_coverage >= 10:
                ic_score = 90
                explanation = "Strong interest coverage (>10x)"
            elif interest_coverage >= 5:
                ic_score = 80
                explanation = "Good interest coverage (5-10x)"
            elif interest_coverage >= 2.5:
                ic_score = 70
                explanation = "Adequate coverage (2.5-5x)"
            elif interest_coverage >= 1.5:
                ic_score = 50
                explanation = "Weak coverage (1.5-2.5x)"
            else:
                ic_score = 30
                explanation = "Insufficient coverage (<1.5x)"

            metrics.append(MetricScore(
                name="Interest Coverage",
                score=ic_score,
                weight=0.25,
                component="financial_health",
                explanation=explanation
            ))
            scores.append((ic_score, 0.25))

        if not scores:
            return 50.0, metrics

        total_score = sum(s * w for s, w in scores) / sum(w for _, w in scores)
        return min(100, max(0, total_score)), metrics

    def calculate_profitability_score(self, data: Dict[str, Any]) -> Tuple[float, List[MetricScore]]:
        """
        Calculate profitability score (0-100)
        Uses ROE, ROA, net margin, EBITDA margin
        """
        metrics = []
        scores = []

        # ROE Score
        roe = data.get('roe', 0)
        if roe:
            if roe >= 20:
                roe_score = 90
                explanation = "Excellent ROE (>20%)"
            elif roe >= 15:
                roe_score = 80
                explanation = "Very good ROE (15-20%)"
            elif roe >= 10:
                roe_score = 70
                explanation = "Good ROE (10-15%)"
            elif roe >= 5:
                roe_score = 60
                explanation = "Acceptable ROE (5-10%)"
            else:
                roe_score = max(20, 50 + roe)
                explanation = f"Poor ROE ({roe:.1f}%)"

            metrics.append(MetricScore(
                name="ROE",
                score=roe_score,
                weight=0.40,
                component="profitability",
                explanation=explanation
            ))
            scores.append((roe_score, 0.40))

        # Net Margin Score
        net_margin = data.get('net_margin', 0)
        if net_margin is not None:
            if net_margin >= 15:
                nm_score = 90
                explanation = "Excellent margins (>15%)"
            elif net_margin >= 10:
                nm_score = 80
                explanation = "Very good margins (10-15%)"
            elif net_margin >= 5:
                nm_score = 70
                explanation = "Good margins (5-10%)"
            elif net_margin >= 2:
                nm_score = 60
                explanation = "Acceptable margins (2-5%)"
            else:
                nm_score = max(20, 50 + net_margin * 5)
                explanation = f"Thin margins ({net_margin:.1f}%)"

            metrics.append(MetricScore(
                name="Net Margin",
                score=nm_score,
                weight=0.35,
                component="profitability",
                explanation=explanation
            ))
            scores.append((nm_score, 0.35))

        # EBITDA Margin Score
        ebitda_margin = data.get('ebitda_margin', 0)
        if ebitda_margin is not None:
            if ebitda_margin >= 25:
                em_score = 90
                explanation = "Excellent EBITDA margin (>25%)"
            elif ebitda_margin >= 20:
                em_score = 80
                explanation = "Good EBITDA margin (20-25%)"
            elif ebitda_margin >= 15:
                em_score = 70
                explanation = "Adequate EBITDA margin (15-20%)"
            elif ebitda_margin >= 10:
                em_score = 60
                explanation = "Fair EBITDA margin (10-15%)"
            else:
                em_score = max(30, 50 + ebitda_margin)
                explanation = f"Low EBITDA margin ({ebitda_margin:.1f}%)"

            metrics.append(MetricScore(
                name="EBITDA Margin",
                score=em_score,
                weight=0.25,
                component="profitability",
                explanation=explanation
            ))
            scores.append((em_score, 0.25))

        if not scores:
            return 50.0, metrics

        total_score = sum(s * w for s, w in scores) / sum(w for _, w in scores)
        return min(100, max(0, total_score)), metrics

    def calculate_growth_score(self, data: Dict[str, Any]) -> Tuple[float, List[MetricScore]]:
        """
        Calculate growth score (0-100)
        Uses revenue growth, earnings growth, consistency
        """
        metrics = []
        scores = []

        # Revenue Growth Score
        rev_growth = data.get('revenue_growth_yoy', 0)
        if rev_growth is not None:
            if rev_growth >= 25:
                rg_score = 90
                explanation = "Exceptional growth (>25%)"
            elif rev_growth >= 15:
                rg_score = 80
                explanation = "Strong growth (15-25%)"
            elif rev_growth >= 10:
                rg_score = 70
                explanation = "Good growth (10-15%)"
            elif rev_growth >= 5:
                rg_score = 60
                explanation = "Moderate growth (5-10%)"
            elif rev_growth >= 0:
                rg_score = 50
                explanation = "Slow growth (0-5%)"
            else:
                rg_score = max(20, 50 + rev_growth * 2)
                explanation = f"Declining ({rev_growth:.1f}%)"

            metrics.append(MetricScore(
                name="Revenue Growth",
                score=rg_score,
                weight=0.50,
                component="growth",
                explanation=explanation
            ))
            scores.append((rg_score, 0.50))

        # Earnings Growth Score
        eps_growth = data.get('eps_growth_yoy', 0)
        if eps_growth is not None:
            if eps_growth >= 20:
                eg_score = 90
                explanation = "Strong earnings growth (>20%)"
            elif eps_growth >= 10:
                eg_score = 80
                explanation = "Good earnings growth (10-20%)"
            elif eps_growth >= 5:
                eg_score = 70
                explanation = "Moderate earnings growth (5-10%)"
            elif eps_growth >= 0:
                eg_score = 60
                explanation = "Slight earnings growth (0-5%)"
            else:
                eg_score = max(20, 50 + eps_growth * 3)
                explanation = f"Declining earnings ({eps_growth:.1f}%)"

            metrics.append(MetricScore(
                name="EPS Growth",
                score=eg_score,
                weight=0.50,
                component="growth",
                explanation=explanation
            ))
            scores.append((eg_score, 0.50))

        if not scores:
            return 50.0, metrics

        total_score = sum(s * w for s, w in scores) / sum(w for _, w in scores)
        return min(100, max(0, total_score)), metrics

    def calculate_momentum_score(self, data: Dict[str, Any]) -> Tuple[float, List[MetricScore]]:
        """
        Calculate momentum score (0-100)
        Uses price momentum, 52-week range, technical indicators
        """
        metrics = []
        scores = []

        # Price Momentum Score
        momentum = data.get('price_momentum_3m', 0)
        if momentum is not None:
            if momentum >= 20:
                mom_score = 90
                explanation = "Strong upward momentum (>20%)"
            elif momentum >= 10:
                mom_score = 80
                explanation = "Good momentum (10-20%)"
            elif momentum >= 0:
                mom_score = 60
                explanation = "Positive momentum (0-10%)"
            elif momentum >= -10:
                mom_score = 40
                explanation = "Slight downward momentum (-10-0%)"
            else:
                mom_score = max(20, 60 + momentum)
                explanation = f"Strong downward momentum ({momentum:.1f}%)"

            metrics.append(MetricScore(
                name="Price Momentum",
                score=mom_score,
                weight=0.50,
                component="momentum",
                explanation=explanation
            ))
            scores.append((mom_score, 0.50))

        # 52-Week Performance Score
        week_52_perf = data.get('week_52_change', 0)
        if week_52_perf is not None:
            if week_52_perf >= 30:
                w52_score = 90
                explanation = "Strong 52-week performance (>30%)"
            elif week_52_perf >= 15:
                w52_score = 80
                explanation = "Good 52-week performance (15-30%)"
            elif week_52_perf >= 0:
                w52_score = 70
                explanation = "Positive 52-week performance (0-15%)"
            elif week_52_perf >= -15:
                w52_score = 50
                explanation = "Weak 52-week performance (-15-0%)"
            else:
                w52_score = max(20, 50 + week_52_perf / 2)
                explanation = f"Poor 52-week performance ({week_52_perf:.1f}%)"

            metrics.append(MetricScore(
                name="52-Week Performance",
                score=w52_score,
                weight=0.50,
                component="momentum",
                explanation=explanation
            ))
            scores.append((w52_score, 0.50))

        if not scores:
            return 50.0, metrics

        total_score = sum(s * w for s, w in scores) / sum(w for _, w in scores)
        return min(100, max(0, total_score)), metrics

    def calculate_risk_score(self, data: Dict[str, Any]) -> Tuple[float, List[MetricScore]]:
        """
        Calculate risk score (0-100, higher = less risk)
        Uses volatility, beta, drawdown
        """
        metrics = []
        scores = []

        # Volatility Score (inverted: lower vol = higher score)
        volatility = data.get('volatility', 0.30)
        if volatility >= 0:
            if volatility <= 0.15:
                vol_score = 90
                explanation = "Low volatility (<15%)"
            elif volatility <= 0.25:
                vol_score = 80
                explanation = "Moderate volatility (15-25%)"
            elif volatility <= 0.40:
                vol_score = 70
                explanation = "Elevated volatility (25-40%)"
            elif volatility <= 0.60:
                vol_score = 50
                explanation = "High volatility (40-60%)"
            else:
                vol_score = max(20, 100 - volatility * 50)
                explanation = f"Very high volatility ({volatility*100:.0f}%)"

            metrics.append(MetricScore(
                name="Volatility",
                score=vol_score,
                weight=0.50,
                component="risk",
                explanation=explanation
            ))
            scores.append((vol_score, 0.50))

        # Beta Score (inverted: lower beta = higher score)
        beta = data.get('beta', 1.0)
        if beta > 0:
            if beta <= 0.8:
                beta_score = 90
                explanation = "Defensive (β < 0.8)"
            elif beta <= 1.0:
                beta_score = 80
                explanation = "Market-level (β 0.8-1.0)"
            elif beta <= 1.3:
                beta_score = 70
                explanation = "Aggressive (β 1.0-1.3)"
            else:
                beta_score = max(40, 100 - (beta - 1.3) * 20)
                explanation = f"Very aggressive (β {beta:.1f})"

            metrics.append(MetricScore(
                name="Beta",
                score=beta_score,
                weight=0.50,
                component="risk",
                explanation=explanation
            ))
            scores.append((beta_score, 0.50))

        if not scores:
            return 50.0, metrics

        total_score = sum(s * w for s, w in scores) / sum(w for _, w in scores)
        return min(100, max(0, total_score)), metrics

    def determine_band(self, score: float) -> str:
        """Determine health score band"""
        for band in ScoreBand:
            if band.value[0] <= score <= band.value[1]:
                return band.value[2]
        return "Unknown"

    def identify_strengths(self, metrics: List[MetricScore]) -> List[str]:
        """Identify top 3 strengths"""
        strong = [m for m in metrics if m.score >= 75]
        return [f"{m.name}: {m.explanation}" for m in sorted(strong, key=lambda x: x.score, reverse=True)[:3]]

    def identify_weaknesses(self, metrics: List[MetricScore]) -> List[str]:
        """Identify top 3 weaknesses"""
        weak = [m for m in metrics if m.score < 50]
        return [f"{m.name}: {m.explanation}" for m in sorted(weak, key=lambda x: x.score)[:3]]

    def generate_recommendations(self, components: Dict[str, float]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if components.get('financial_health', 50) < 60:
            recommendations.append("Reduce debt or improve liquidity ratios")

        if components.get('profitability', 50) < 60:
            recommendations.append("Focus on margin expansion and operational efficiency")

        if components.get('growth', 50) < 60:
            recommendations.append("Seek growth opportunities or new markets")

        if components.get('momentum', 50) < 60:
            recommendations.append("Monitor market sentiment and technical trends")

        if components.get('valuation', 50) > 70:
            recommendations.append("Stock may be overvalued; consider waiting for pullback")

        return recommendations[:3]

    def calculate(self, ticker: str, data: Dict[str, Any]) -> HealthReport:
        """Calculate complete health score and report"""

        # Calculate component scores
        valuation_score, valuation_metrics = self.calculate_valuation_score(data)
        financial_health_score, fh_metrics = self.calculate_financial_health_score(data)
        profitability_score, prof_metrics = self.calculate_profitability_score(data)
        growth_score, growth_metrics = self.calculate_growth_score(data)
        momentum_score, momentum_metrics = self.calculate_momentum_score(data)
        risk_score, risk_metrics = self.calculate_risk_score(data)

        # Combine all metrics
        all_metrics = (
            valuation_metrics + fh_metrics + prof_metrics +
            growth_metrics + momentum_metrics + risk_metrics
        )

        # Calculate weighted overall score
        components = {
            'valuation': valuation_score,
            'financial_health': financial_health_score,
            'profitability': profitability_score,
            'growth': growth_score,
            'momentum': momentum_score,
            'risk': risk_score
        }

        overall_score = sum(
            components[name] * weight
            for name, weight in self.component_weights.items()
        )
        overall_score = min(100, max(0, overall_score))

        # Data quality score (based on how many metrics we have)
        data_quality = min(100, (len(all_metrics) / 15) * 100)

        return HealthReport(
            ticker=ticker,
            overall_score=round(overall_score, 1),
            band=self.determine_band(overall_score),
            components={name: round(score, 1) for name, score in components.items()},
            metrics=all_metrics,
            strengths=self.identify_strengths(all_metrics),
            weaknesses=self.identify_weaknesses(all_metrics),
            recommendations=self.generate_recommendations(components),
            data_quality=round(data_quality, 1)
        )


def main():
    """Process input and output JSON report"""
    try:
        # Read input from stdin or command line
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        ticker = data.get('ticker', 'UNKNOWN')

        calculator = HealthCalculator()
        report = calculator.calculate(ticker, data)

        # Output as JSON
        output = {
            'ticker': report.ticker,
            'overall_score': report.overall_score,
            'band': report.band,
            'components': report.components,
            'data_quality': report.data_quality,
            'strengths': report.strengths,
            'weaknesses': report.weaknesses,
            'recommendations': report.recommendations,
            'metrics_count': len(report.metrics)
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
