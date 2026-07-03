#!/usr/bin/env python3
"""Backtest conviction model performance against historical returns.

Validates that the conviction score separating high/low performers is
statistically significant. Uses walk-forward methodology with NSE data.

Usage:
    python backtest_conviction.py --fetch          # Download 5Y NSE price data
    python backtest_conviction.py --run            # Run full backtest
    python backtest_conviction.py --report         # Print latest report

Output: PASSED if mean_Q4 > mean_Q1 and p < 0.05
        MARGINAL if signal exists but weak
        FAILED if no predictive power
"""

import argparse
import json
import os
import pickle
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "bt_conviction_data"
RESULTS_FILE = DATA_DIR / "conviction_results.pkl"

DATA_DIR.mkdir(parents=True, exist_ok=True)

NSE_SUFFIX = ".NS"
RISK_FREE_RATE = 0.065
TRADING_DAYS = 252

NIFTY500_TICKERS = [
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "ITC", "SBIN",
    "BHARTIARTL", "LT", "KOTAKBANK", "BAJFINANCE", "HINDUNILVR", "WIPRO",
    "TITAN", "MARUTI", "SUNPHARMA", "ONGC", "ADANIPORTS", "NTPC", "ULTRACEMCO",
    "HCLTECH", "POWERGRID", "ASIANPAINT", "M&M", "TRENT", "JSWSTEEL",
    "AXISBANK", "BAJAJFINSV", "TATAMOTORS", "HINDALCO", "TATASTEEL", "ADANIENT",
    "COALINDIA", "SHRIRAMFIN", "INDUSINDBK", "NESTLEIND", "BPCL", "BEL",
    "GRASIM", "TATACONSUM", "EICHERMOT", "HEROMOTOCO", "HDFCLIFE", "BRITANNIA",
    "DIVISLAB", "CIPLA", "APOLLOHOSP", "SBILIFE", "DRREDDY", "BAJAJ-AUTO",
    "PIDILITIND", "HINDZINC", "VEDL", "IOC", "GAIL", "HINDALCO",
    "YESBANK", "IDEA", "SAIL", "BHEL", "PNB", "BANKBARODA",
    "UNIONBANK", "CANBK", "INDIANB", "IDFCFIRSTB", "FEDERALBNK",
    "MOTHERSUMI", "ASHOKLEY", "EICHERMOT", "MARICO", "DABUR",
    "COLPAL", "GODREJCP", "BRITANNIA", "HAVELLS", "VOLTAS",
    "SIEMENS", "ABB", "BATAINDIA", "JUBLFOOD", "RESTAURANT",
    "MCDOWELL-N", "PGHH", "CASTROLIND", "GODREJIND",
    "ABFRL", "ALKEM", "AUROPHARMA", "BIOCON", "CADILAHC",
    "GLENMARK", "LUPIN", "TORNTPHARM", "LAURUSLABS",
    "DIXON", "TVSMOTOR", "MUTHOOTFIN", "L&TFH",
    "CHOLAFIN", "MANAPPURAM", "SRTRANSFIN", "HAL",
    "BHARATFORG", "AMBUJACEM", "ACC", "RAMCOCEM",
    "JKCEMENT", "SHREECEM", "DLF", "GODREJPROP",
    "OBEROIRLTY", "PHOENIXLTD", "ADANIGREEN", "ADANITRANS",
    "STERLITE", "HINDCOPPER", "NATIONALUM", "JINDALSTEL",
]


class PricesFetcher:
    def __init__(self, years=5):
        self.years = years
        self.end_date = datetime.now()
        self.start_date = self.end_date - timedelta(days=years * 365)

    def fetch(self, tickers=None):
        if tickers is None:
            tickers = NIFTY500_TICKERS
        import yfinance as yf
        results = {}
        print(f"Fetching {len(tickers)} tickers ({self.years}y)...")
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(self._fetch_one, yf, t): t for t in tickers}
            for f in as_completed(futures):
                t = futures[f]
                df = f.result()
                if df is not None and len(df) > 200:
                    results[t] = df
                    print(f"  {t}: {len(df)} candles")
                else:
                    print(f"  {t}: skipped")
                time.sleep(0.1)
        print(f"Fetched {len(results)}/{len(tickers)}")
        return results

    def _fetch_one(self, yf, ticker):
        cache = DATA_DIR / f"{ticker}.parquet"
        if cache.exists():
            try:
                return pd.read_parquet(cache)
            except Exception:
                pass
        try:
            s = yf.Ticker(ticker + NSE_SUFFIX)
            df = s.history(start=self.start_date.strftime("%Y-%m-%d"),
                           end=self.end_date.strftime("%Y-%m-%d"), auto_adjust=True)
            if df.empty:
                return None
            df.index = pd.to_datetime(df.index)
            df.index.name = "date"
            df.columns = [c.lower() for c in df.columns]
            df["ticker"] = ticker
            for c in ["open", "high", "low", "close", "volume"]:
                if c not in df.columns:
                    df[c] = np.nan
            df.to_parquet(cache)
            return df
        except Exception:
            return None

    def load_cached(self):
        results = {}
        for f in DATA_DIR.glob("*.parquet"):
            t = f.stem
            try:
                df = pd.read_parquet(f)
                if not df.empty:
                    results[t] = df
            except Exception:
                pass
        return results


def compute_features(df):
    df = df.copy()
    c = df["close"].astype(float)
    v = df["volume"].astype(float)
    df["ret_1m"] = c.pct_change(21)
    df["ret_3m"] = c.pct_change(63)
    df["ret_6m"] = c.pct_change(126)
    df["mom_6m"] = df["ret_6m"]
    df["vol_20d"] = df["ret_1m"].rolling(20).std() * np.sqrt(TRADING_DAYS)
    df["sma_50"] = c.rolling(50).mean()
    df["sma_200"] = c.rolling(200).mean()
    df["pct_vs_sma50"] = (c / df["sma_50"] - 1) * 100
    df["high_52w"] = c.rolling(252).max()
    df["pct_from_52w_high"] = (c / df["high_52w"] - 1) * 100
    delta = c.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))
    df["volume_sma20"] = v.rolling(20).mean()
    df["volume_ratio"] = v / df["volume_sma20"].replace(0, np.nan)
    return df


def compute_conviction(row):
    quality = min(100, max(0, 50 + (
        (row.get("pct_vs_sma50", 0) > 0) * 10 +
        (row.get("rsi_14", 50) if pd.notna(row.get("rsi_14")) else 50) / 5 +
        (1 if row.get("volume_ratio", 1) and row["volume_ratio"] > 1.2 else 0) * 10
    )))
    growth = min(100, max(0, 50 + (row.get("mom_6m", 0) or 0) * 100))
    risk = min(100, max(0, 50 - (
        (row.get("vol_20d", 0.3) or 0.3) * 50 +
        (1 if pd.notna(row.get("pct_from_52w_high")) and row["pct_from_52w_high"] < -20 else 0) * 20
    )))
    quality = float(quality)
    growth = float(growth)
    risk = float(risk)
    conviction = quality * 0.35 + growth * 0.25 + (100 - risk) * 0.25 + 50 * 0.15
    return {
        "quality_score": round(quality, 1),
        "growth_score": round(growth, 1),
        "risk_score": round(risk, 1),
        "conviction_score": round(conviction, 1),
    }


def run_backtest(data, months_horizon=3):
    horizons = {"1M": 21, "3M": 63, "6M": 126}
    horizon_days = horizons.get(f"{months_horizon}M", 63)
    horizon_label = f"{months_horizon}M"

    common_dates = sorted(set.intersection(
        *(set(d.index) for d in data.values() if not d.empty)
    ))
    print(f"Common trading days: {len(common_dates)}")
    if len(common_dates) < 100:
        return {"error": "insufficient common dates"}

    snapshots = []
    rebalance_freq = 21
    for i in range(0, len(common_dates) - horizon_days - rebalance_freq, rebalance_freq):
        current_date = common_dates[i]
        future_date = common_dates[i + horizon_days]

        stocks = []
        for ticker, df in data.items():
            if df.empty:
                continue
            before = df.loc[df.index <= current_date]
            if before.empty:
                continue
            latest = before.iloc[-1]

            future = df.loc[df.index >= future_date]
            if len(future) < 2:
                continue
            future_return = (future.iloc[1]["close"] - latest["close"]) / latest["close"]

            feats = compute_features(before)
            last_feat = feats.iloc[-1]
            scores = compute_conviction(last_feat)
            scores["ticker"] = ticker
            scores["date"] = current_date
            scores["future_return"] = float(future_return)
            stocks.append(scores)

        if len(stocks) < 10:
            continue

        snapshots.extend(stocks)

    df = pd.DataFrame(snapshots)
    if df.empty:
        return {"error": "no valid snapshots"}

    df["quartile"] = pd.qcut(df["conviction_score"], q=4, labels=["Q1", "Q2", "Q3", "Q4"])

    q_returns = df.groupby("quartile")["future_return"].agg(["mean", "median", "count"])
    print(f"\nReturns by Conviction Quartile ({horizon_label} forward):")
    print(q_returns.round(4))

    q1 = df[df["quartile"] == "Q1"]["future_return"]
    q4 = df[df["quartile"] == "Q4"]["future_return"]

    from scipy import stats
    t_stat, p_value = stats.ttest_ind(q4.dropna(), q1.dropna())

    results = {
        "horizon": horizon_label,
        "n_snapshots": len(snapshots),
        "n_unique_stocks": df["ticker"].nunique(),
        "q1_mean_return": float(q1.mean()),
        "q4_mean_return": float(q4.mean()),
        "spread": float(q4.mean() - q1.mean()),
        "t_statistic": float(t_stat),
        "p_value": float(p_value),
        "significant": bool(p_value < 0.05),
        "q1_count": len(q1),
        "q4_count": len(q4),
        "status": "PASSED" if (q4.mean() > q1.mean() and p_value < 0.05) else (
            "MARGINAL" if q4.mean() > q1.mean() else "FAILED"
        ),
    }

    print(f"\n{'='*50}")
    print(f"BACKTEST RESULT ({horizon_label})")
    print(f"{'='*50}")
    print(f"  Q1 (Low conviction) mean return: {q1.mean():+.4f}")
    print(f"  Q4 (High conviction) mean return: {q4.mean():+.4f}")
    print(f"  Spread: {results['spread']:+.4f}")
    print(f"  T-statistic: {t_stat:.4f}")
    print(f"  P-value: {p_value:.4f}")
    print(f"  Status: {results['status']}")
    print(f"  Significant: {results['significant']}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Backtest conviction model")
    parser.add_argument("--fetch", action="store_true", help="Download 5Y NSE data")
    parser.add_argument("--run", action="store_true", help="Run backtest")
    parser.add_argument("--report", action="store_true", help="Print last report")
    args = parser.parse_args()

    fetcher = PricesFetcher(years=5)

    if args.fetch:
        data = fetcher.fetch()
        print(f"Saved {len(data)} tickers to {DATA_DIR}")

    elif args.run:
        data = fetcher.load_cached()
        if not data:
            print("No cached data. Run with --fetch first.")
            return
        print(f"Loaded {len(data)} tickers from cache")

        result = run_backtest(data, months_horizon=3)

        with open(RESULTS_FILE, "wb") as f:
            pickle.dump(result, f)
        with open(str(RESULTS_FILE) + ".json", "w") as f:
            json.dump(result, f, indent=2, default=str)

        print(f"\nResults saved to {RESULTS_FILE}")
        print(f"PASSED? {'✅' if result.get('status') == 'PASSED' else '❌' if result.get('status') == 'FAILED' else '⚠️'} {result.get('status', 'ERROR')}")

    elif args.report:
        if RESULTS_FILE.exists():
            with open(RESULTS_FILE, "rb") as f:
                r = pickle.load(f)
            print(json.dumps(r, indent=2))
            status = r.get("status", "UNKNOWN")
            print(f"\nVerdict: {status}")
            if status == "PASSED":
                print("✅ Model successfully predicts forward returns")
            elif status == "MARGINAL":
                print("⚠️  Signal exists but needs calibration")
            else:
                print("❌ Model has no predictive power — recalibrate")
        else:
            print("No results. Run with --run first.")


if __name__ == "__main__":
    main()
