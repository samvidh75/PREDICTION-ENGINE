#!/usr/bin/env python3
"""
Analyze score distribution across stock universe.
Goal: Understand if Quality/Risk/Growth scores separate high/low performers.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from scipy import stats
import os

DB_URL = os.getenv('DATABASE_URL', 'postgresql://localhost/stockstory')
engine = create_engine(DB_URL)

query = """
SELECT 
    symbol,
    quality_score,
    valuation_score,
    growth_score,
    risk_score,
    stability_score,
    momentum_score,
    conviction_score,
    price_3_months_ago,
    current_price,
    ((current_price - price_3_months_ago) / NULLIF(price_3_months_ago, 0)) * 100 as return_3m
FROM stock_scores
WHERE 
    snapshot_date >= now() - interval '3 months'
    AND snapshot_date < now() - interval '3 days'
    AND current_price > 0
ORDER BY snapshot_date DESC, symbol
"""

df = pd.read_sql(query, engine)
print(f"Loaded {len(df)} stock-date observations")

print("\nScore Distributions:")
print(df[['quality_score', 'valuation_score', 'growth_score', 'risk_score', 'conviction_score']].describe())

df['conviction_quartile'] = pd.qcut(df['conviction_score'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'])

print("\nReturn by Conviction Quartile (3-month forward):")
quartile_returns = df.groupby('conviction_quartile')['return_3m'].agg([
    ('count', 'count'),
    ('mean', 'mean'),
    ('median', 'median'),
    ('std', 'std'),
    ('min', 'min'),
    ('max', 'max')
])
print(quartile_returns)

q1_returns = df[df['conviction_quartile'] == 'Q1 (Low)']['return_3m'].dropna()
q4_returns = df[df['conviction_quartile'] == 'Q4 (High)']['return_3m'].dropna()

t_stat, p_value = stats.ttest_ind(q4_returns, q1_returns)
print(f"\nT-test: Q4 vs Q1")
print(f"   Q4 mean return: {q4_returns.mean():.2f}%")
print(f"   Q1 mean return: {q1_returns.mean():.2f}%")
print(f"   Difference: {q4_returns.mean() - q1_returns.mean():.2f}%")
print(f"   P-value: {p_value:.4f}")
if p_value < 0.05:
    print("   STATISTICALLY SIGNIFICANT (p < 0.05)")
else:
    print("   NOT significant — recalibrate thresholds")

print("\nPer-Factor Correlation with Future Returns:")
factors = ['quality_score', 'valuation_score', 'growth_score', 'risk_score', 'stability_score', 'momentum_score']

for factor in factors:
    correlation = df[factor].corr(df['return_3m'])
    print(f"  {factor:20s}: {correlation:+.4f}")

df['quality_tercile'] = pd.qcut(df['quality_score'], q=3, labels=['Low', 'Med', 'High'])
quality_returns = df.groupby('quality_tercile')['return_3m'].mean()
print(f"\nQuality Score Impact:")
print(f"  Low quality:  {quality_returns['Low']:+.2f}%")
print(f"  Med quality:  {quality_returns['Med']:+.2f}%")
print(f"  High quality: {quality_returns['High']:+.2f}%")

df['risk_tercile'] = pd.qcut(df['risk_score'], q=3, labels=['Low', 'Med', 'High'])
risk_returns = df.groupby('risk_tercile')['return_3m'].mean()
print(f"\nRisk Score Impact:")
print(f"  Low risk:  {risk_returns['Low']:+.2f}%")
print(f"  Med risk:  {risk_returns['Med']:+.2f}%")
print(f"  High risk: {risk_returns['High']:+.2f}%")

fig, axes = plt.subplots(2, 3, figsize=(15, 10))

axes[0, 0].scatter(df['conviction_score'], df['return_3m'], alpha=0.3, s=20)
axes[0, 0].set_xlabel('Conviction Score')
axes[0, 0].set_ylabel('3-Month Return %')
axes[0, 0].set_title('Conviction Score vs Actual Returns')

axes[0, 1].scatter(df['quality_score'], df['return_3m'], alpha=0.3, s=20)
axes[0, 1].set_xlabel('Quality Score')
axes[0, 1].set_ylabel('3-Month Return %')
axes[0, 1].set_title('Quality vs Returns')

axes[0, 2].scatter(df['risk_score'], df['return_3m'], alpha=0.3, s=20)
axes[0, 2].set_xlabel('Risk Score')
axes[0, 2].set_ylabel('3-Month Return %')
axes[0, 2].set_title('Risk vs Returns')

df.boxplot(column='return_3m', by='conviction_quartile', ax=axes[1, 0])
axes[1, 0].set_title('Returns by Conviction Quartile')

df.boxplot(column='return_3m', by='quality_tercile', ax=axes[1, 1])
axes[1, 1].set_title('Returns by Quality Tercile')

df.boxplot(column='return_3m', by='risk_tercile', ax=axes[1, 2])
axes[1, 2].set_title('Returns by Risk Tercile')

plt.tight_layout()
plt.savefig('outputs/score_distribution_analysis.png', dpi=300)
print("\nChart saved to outputs/score_distribution_analysis.png")

print("\n" + "="*60)
print("RECOMMENDATIONS FOR THRESHOLD TUNING:")
print("="*60)

if q4_returns.mean() > q1_returns.mean() and p_value < 0.05:
    print("Current conviction model is PREDICTIVE")
    print("   Action: Ship as-is")
else:
    print("Conviction model shows weak signal")
    print("   Action needed:")
    print("   1. Increase weight on Quality (if corr > 0.15)")
    print("   2. Adjust Risk threshold (if inversely correlated)")
    print("   3. Add technical/momentum factors")
    print("   4. Consider sector-relative scoring")
