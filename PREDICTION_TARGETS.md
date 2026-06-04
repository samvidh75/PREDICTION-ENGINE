# PREDICTION TARGETS FRAMEWORK

This document defines the standard prediction targets implemented in **StockStory Prediction Engine Foundation (v1)**. These targets represent the ground-truth variable definitions used to benchmark all supervised ML algorithms.

---

### 1. 7-Day Forward Return
*   **Variable Name**: `return7D`
*   **Type**: Continuous Regressor
*   **Objective**: Capture short-term swing trading opportunities and price reactions.
*   **Formula**:
    $$\text{Return}_{7D, t} = \frac{\text{Close}_{t+7} - \text{Close}_t}{\text{Close}_t}$$

### 2. 30-Day Forward Return
*   **Variable Name**: `return30D`
*   **Type**: Continuous Regressor
*   **Objective**: Capture medium-term trend follow-through and institutional alignment.
*   **Formula**:
    $$\text{Return}_{30D, t} = \frac{\text{Close}_{t+30} - \text{Close}_t}{\text{Close}_t}$$

### 3. 90-Day Forward Return
*   **Variable Name**: `return90D`
*   **Type**: Continuous Regressor
*   **Objective**: Capture long-term positioning, corporate earnings cycles, and structural trends.
*   **Formula**:
    $$\text{Return}_{90D, t} = \frac{\text{Close}_{t+90} - \text{Close}_t}{\text{Close}_t}$$

### 4. Risk-Adjusted Forward Return
*   **Variable Name**: `riskAdjustedReturn30D`
*   **Type**: Continuous Regressor
*   **Objective**: Quantify volatility-adjusted performance, allowing models to select entries with the highest return-to-risk ratio.
*   **Formula**:
    $$\text{RiskAdjustedReturn}_{30D, t} = \frac{\text{Return}_{30D, t}}{\text{Volatility}_{20D, t}}$$
    where $\text{Volatility}_{20D, t}$ is the annualized standard deviation of daily returns over the preceding 20 days.

### 5. Drawdown Probability
*   **Variable Name**: `drawdownProbability30D`
*   **Type**: Binary Classifier Label (0 or 1)
*   **Objective**: Predict risk of capital impairment. Flags whether the asset price will drop below a specific negative threshold (-5%) at any point during the future 30-day window.
*   **Formula**:
    $$\text{DrawdownLabel}_{30D, t} = \begin{cases} 1 & \text{if } \min_{1 \le d \le 30} \left(\frac{\text{Close}_{t+d} - \text{Close}_t}{\text{Close}_t}\right) < -0.05 \\ 0 & \text{otherwise} \end{cases}$$
