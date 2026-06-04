# MODEL COMPARISON REPORT

This report compares performance metrics between **Factor-Only Baselines**, **LightGBM Benchmarks**, and **XGBoost Benchmarks** across 5 years of historical stock data.

---

## 1. 30-Day Forward Return Performance Comparison

| Model Architecture | MAE | RMSE | Directional Accuracy | Precision | Recall |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Factor Engine Baseline** | - | - | **53.4%** | - | - |
| **LightGBM Model** | 0.0627 | 0.0788 | 44.87% | 43.55% | 53.42% |
| **XGBoost Model** | 0.0624 | 0.0789 | 47.48% | 46.30% | 64.76% |

---

## 2. Benchmark Observations

1. **Underperforming the Baseline**: Neither LightGBM (44.87%) nor XGBoost (47.48%) beats the raw Factor Engine Baseline (53.4%) in Directional Accuracy on the 30-day return horizon.
2. **Prediction Error Bounds**: The prediction error (MAE ~0.06) remains relatively tight, showing that GBDT models do not make wild predictions, but they struggle to out-predict the simpler momentum and value factor signals due to the high noise-to-signal ratio of daily prices.
3. **Recall Strengths**: GBDT models show strong Recall (~53-65%), indicating they are sensitive to market gains but suffer from a high rate of false positives (low Precision), which pulls down their overall directional accuracy.
