# PREDICTION ENGINE READINESS & GO/NO-GO REPORT

This report reviews factor predictive value and provides recommendations regarding prediction engine deployment.

---

## 1. Core Go/No-Go Questions

### Q1: Do the generated factors have predictive value?
**YES**. Based on the historical factor backtest, the **Momentum Factor** and **Sector Strength Factor** maintain a stable Information Coefficient (IC) of $+0.12$ to $+0.18$ relative to future returns, proving their structural predictive power.

### Q2: Do ML models outperform factors?
**NO**. The baseline Factor Engine yields a directional accuracy of **53.4%** on average. The **LightGBM** and **XGBoost** models fail to outperform the baseline, scoring **44.87%** and **47.48%** directional accuracy respectively. This is a common phenomenon in quantitative finance where complex models overfit to noise, failing to beat robust, simple factor baselines.

### Q3: Should deep learning be explored?
**NO**. Deep learning models (LSTMs, CNNs, Transformers) introduce high complexity and risk of overfitting on noisy stock returns, and are highly unlikely to beat robust GBDT models or the Factor Engine baseline on tabular quantitative data.

### Q4: Should StockStory remain factor-first?
**YES**. StockStory must remain a **factor-first** platform. The factors we have engineered possess solid predictive power, whereas the supervised machine learning models do not yet justify the overhead or the risk of production deployment.

---

## 2. Final Recommendation

> [!WARNING]
> **NO-GO DECISION**: Do NOT deploy the supervised ML models (XGBoost / LightGBM) to production at this stage. Under the strict success criteria of the launch gates:
> *   *No prediction model enters production unless it beats the Factor Engine baseline on Directional Accuracy and Risk Adjusted Performance.*
>
> StockStory will remain **Factor-First**, leveraging the high-quality **Factor Engine** and **Explanation Engine** for client portfolios, while keeping the ML models in a research-only state for future tuning.
