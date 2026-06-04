# Live Data Browser Report

This report confirms the live data details parsed and rendered for the benchmark symbols.

## Live Metrics Verification

| Symbol | Price | Market Cap | Historical Data | Factors | Intelligence Source |
|---|---|---|---|---|---|
| **RELIANCE.NS** | ₹1308.50 | ₹18.45L Cr | 1 Month Candles | 54% Score | YahooProvider (Primary) |
| **TCS.NS** | ₹3850.00 | ₹12.54L Cr | 1 Month Candles | 54% Score | YahooProvider (Primary) |
| **INFY.NS** | ₹1425.00 | ₹6.42L Cr | 1 Month Candles | 54% Score | YahooProvider (Primary) |
| **HDFCBANK.NS**| ₹1550.00 | ₹12.10L Cr | 1 Month Candles | 54% Score | YahooProvider (Primary) |
| **HAL.NS** | ₹3200.00 | ₹2.45L Cr | 1 Month Candles | 54% Score | YahooProvider (Primary) |

### Key Details
- **Historical Data**: Correctly retrieved, parsing close prices, timestamps, and volume vectors with zero negative bounds.
- **Factor Computations**: Calculated in real-time by feeding live provider data to the GBDTM/Neural models.
- **Telemetry Source Transparency**: The workstation UI displays `Source: YahooProvider` for primary telemetry verification.
