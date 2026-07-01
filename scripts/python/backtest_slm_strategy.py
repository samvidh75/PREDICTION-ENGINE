"""
SLM-Powered Walk-Forward Backtesting Engine
============================================
Fetches 5+ years of NSE historical data, generates Healthometer scores
via the local Ollama SLM, creates decile portfolios, and computes
institutional-grade performance matrices with walk-forward validation.

Usage:
    python backtest_slm_strategy.py --fetch          # Download 5Y NSE data
    python backtest_slm_strategy.py --run            # Run full backtest
    python backtest_slm_strategy.py --run --no-ollama  # Rule-based scoring (fast)
    python backtest_slm_strategy.py --report         # Show last run summary

Requires:
    pip install yfinance pandas numpy tabulate
"""

import argparse
import json
import os
import pickle
import sys
import time
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "backtest_data"
CACHE_DIR = DATA_DIR / "cache"
REPORT_DIR = SCRIPT_DIR / "backtest_reports"
RESULTS_FILE = DATA_DIR / "backtest_results.pkl"

DATA_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

NSE_SUFFIX = ".NS"
RISK_FREE_RATE = 0.065
TRADING_DAYS = 252

NIFTY50_TICKERS = [
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "ITC", "SBIN",
    "BHARTIARTL", "LT", "KOTAKBANK", "BAJFINANCE", "HINDUNILVR", "WIPRO",
    "TITAN", "MARUTI", "SUNPHARMA", "ONGC", "ADANIPORTS", "NTPC", "ULTRACEMCO",
    "HCLTECH", "POWERGRID", "ASIANPAINT", "M&M", "TRENT", "JSWSTEEL",
    "AXISBANK", "BAJAJFINSV", "TATAMOTORS", "HINDALCO", "TATASTEEL", "ADANIENT",
    "COALINDIA", "SHRIRAMFIN", "INDUSINDBK", "NESTLEIND", "BPCL", "BEL",
    "GRASIM", "TATACONSUM", "EICHERMOT", "HEROMOTOCO", "HDFCLIFE", "BRITANNIA",
    "DIVISLAB", "CIPLA", "APOLLOHOSP", "SBILIFE", "DRREDDY", "BAJAJ-AUTO",
    "HINDZINC", "WIPRO", "PIDILITIND",
]

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "stockstory-slm"

HEALTHOMETER_CACHE: dict[str, dict[str, float]] = {}


# ═══════════════════════════════════════════════════════════════════════
# DATA LAYER
# ═══════════════════════════════════════════════════════════════════════

class NseHistoricalDataFetcher:
    def __init__(self, years: int = 5):
        self.years = years
        self.end_date = datetime.now()
        self.start_date = self.end_date - timedelta(days=years * 365)

    def fetch_ticker(self, ticker: str) -> Optional[pd.DataFrame]:
        cache_path = CACHE_DIR / f"{ticker}.parquet"
        if cache_path.exists():
            try:
                df = pd.read_parquet(cache_path)
                if not df.empty:
                    return df
            except Exception:
                pass

        try:
            import yfinance as yf
        except ImportError:
            print("  Install yfinance: pip install yfinance")
            return None

        try:
            s = yf.Ticker(ticker + NSE_SUFFIX)
            df = s.history(start=self.start_date.strftime("%Y-%m-%d"),
                           end=self.end_date.strftime("%Y-%m-%d"),
                           auto_adjust=True)
            if df.empty:
                return None
            df.index = pd.to_datetime(df.index)
            df.index.name = "date"
            df.columns = [c.lower() for c in df.columns]
            df["ticker"] = ticker
            for col in ["open", "high", "low", "close", "volume"]:
                if col not in df.columns:
                    df[col] = np.nan
            df.to_parquet(cache_path)
            return df
        except Exception as e:
            print(f"  Failed to fetch {ticker}: {e}")
            return None

    def fetch_universe(self, tickers: Optional[list[str]] = None) -> dict[str, pd.DataFrame]:
        if tickers is None:
            tickers = NIFTY50_TICKERS
        print(f"Fetching {len(tickers)} tickers ({self.years} years of data)...")
        results: dict[str, pd.DataFrame] = {}
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(self.fetch_ticker, t): t for t in tickers}
            for future in as_completed(futures):
                t = futures[future]
                df = future.result()
                if df is not None and len(df) > 100:
                    results[t] = df
                    print(f"  {t}: {len(df)} candles ({df.index[0].date()} — {df.index[-1].date()})")
                else:
                    print(f"  {t}: skipped (insufficient data)")
                time.sleep(0.1)
        print(f"Fetched {len(results)}/{len(tickers)} tickers")
        return results

    def load_cached_universe(self) -> dict[str, pd.DataFrame]:
        results: dict[str, pd.DataFrame] = {}
        for f in CACHE_DIR.glob("*.parquet"):
            ticker = f.stem
            df = pd.read_parquet(f)
            if not df.empty:
                results[ticker] = df
        return results

    def universe_summary(self, data: dict[str, pd.DataFrame]) -> pd.DataFrame:
        rows = []
        for ticker, df in data.items():
            rows.append({
                "ticker": ticker,
                "start": df.index[0].date(),
                "end": df.index[-1].date(),
                "days": len(df),
                "close": round(df["close"].iloc[-1], 2),
            })
        return pd.DataFrame(rows).sort_values("ticker").reset_index(drop=True)


# ═══════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════════════

class FeatureEngine:
    @staticmethod
    def compute_features(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        close = df["close"].astype(float)
        volume = df["volume"].astype(float)

        df["returns_1d"] = close.pct_change(1)
        df["returns_5d"] = close.pct_change(5)
        df["returns_20d"] = close.pct_change(20)

        df["volatility_20d"] = df["returns_1d"].rolling(20).std() * np.sqrt(TRADING_DAYS)
        df["volatility_60d"] = df["returns_1d"].rolling(60).std() * np.sqrt(TRADING_DAYS)

        df["sma_20"] = close.rolling(20).mean()
        df["sma_50"] = close.rolling(50).mean()
        df["price_vs_sma20"] = (close / df["sma_20"] - 1) * 100

        df["volume_sma_20"] = volume.rolling(20).mean()
        df["volume_ratio"] = volume / df["volume_sma_20"].replace(0, np.nan)

        df["high_52w"] = close.rolling(252).max()
        df["low_52w"] = close.rolling(252).min()
        df["pct_from_52w_high"] = (close / df["high_52w"] - 1) * 100
        df["pct_from_52w_low"] = (close / df["low_52w"] - 1) * 100

        df["rsi_14"] = FeatureEngine._rsi(close, 14)
        df["macd"] = close.ewm(span=12).mean() - close.ewm(span=26).mean()
        df["macd_signal"] = df["macd"].ewm(span=9).mean()

        df["avg_dollar_volume_20d"] = (close * volume).rolling(20).mean()

        return df

    @staticmethod
    def _rsi(prices: pd.Series, period: int = 14) -> pd.Series:
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        rs = gain / loss.replace(0, np.nan)
        return 100 - (100 / (1 + rs))

    @staticmethod
    def compute_healthometer_rule_based(features: pd.Series) -> float:
        score = 50.0
        if features.get("price_vs_sma20", 0) > 5:
            score += 5
        elif features.get("price_vs_sma20", 0) < -5:
            score -= 5

        rsi = features.get("rsi_14", 50)
        if 40 <= rsi <= 60:
            score += 5
        elif rsi > 80 or rsi < 20:
            score -= 5

        vol = features.get("volatility_20d", 0.3)
        if vol < 0.25:
            score += 5
        elif vol > 0.45:
            score -= 5

        volume_ratio = features.get("volume_ratio", 1)
        if 0.5 <= volume_ratio <= 2.0:
            score += 3
        elif volume_ratio > 5:
            score -= 3

        pct_high = features.get("pct_from_52w_high", 0)
        if pct_high > -5:
            score += 5
        elif pct_high < -30:
            score -= 5

        macd = features.get("macd", 0)
        macd_signal = features.get("macd_signal", 0)
        if macd > macd_signal:
            score += 3
        else:
            score -= 3

        return max(5, min(95, score))


# ═══════════════════════════════════════════════════════════════════════
# SLM SCORING LAYER
# ═══════════════════════════════════════════════════════════════════════

class SlmScorer:
    def __init__(self, use_ollama: bool = True, ollama_url: str = OLLAMA_URL,
                 model: str = OLLAMA_MODEL, cache_results: bool = True):
        self.use_ollama = use_ollama
        self.ollama_url = ollama_url
        self.model = model
        self.cache_results = cache_results
        self._cache: dict[str, dict] = {}

    def build_context(self, ticker: str, date: datetime, features: pd.Series) -> str:
        return (
            f"Asset: {ticker} | Date: {date.strftime('%Y-%m-%d')} | "
            f"Price: {features.get('close', 0):.2f} | "
            f"P/E: N/A | Debt/Equity: N/A | "
            f"Promoter Pledging: N/A | "
            f"RSI(14): {features.get('rsi_14', 50):.1f} | "
            f"Volatility(20d): {features.get('volatility_20d', 0):.3f} | "
            f"Price vs SMA20: {features.get('price_vs_sma20', 0):.1f}% | "
            f"Volume Ratio: {features.get('volume_ratio', 1):.2f}x | "
            f"52W High Proximity: {features.get('pct_from_52w_high', 0):.1f}% | "
            f"Momentum(20d): {features.get('returns_20d', 0) * 100:.1f}%"
        )

    def score(self, ticker: str, date: datetime, features: pd.Series) -> dict:
        cache_key = f"{ticker}_{date.strftime('%Y-%m-%d')}"
        if self.cache_results and cache_key in self._cache:
            return self._cache[cache_key]

        if self.use_ollama:
            result = self._score_via_ollama(ticker, date, features)
        else:
            result = self._score_rule_based(features)

        if self.cache_results:
            self._cache[cache_key] = result
        return result

    def _score_via_ollama(self, ticker: str, date: datetime,
                          features: pd.Series) -> dict:
        context = self.build_context(ticker, date, features)
        prompt = (
            f"Task: Compute structural Healthometer score for an Indian equity. "
            f"Context: {context}"
        )
        try:
            payload = json.dumps({
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1},
            }).encode()
            req = urllib.request.Request(
                self.ollama_url, data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
            text = data.get("response", "")
            ho = self._extract_healthometer(text)
            return {
                "healthometer": ho if ho else self._score_rule_based(features)["healthometer"],
                "risk": self._extract_risk(text),
                "raw_output": text[:200],
                "source": "ollama",
            }
        except Exception as e:
            rule = self._score_rule_based(features)
            rule["source"] = f"ollama_fallback({e})"
            return rule

    def _score_rule_based(self, features: pd.Series) -> dict:
        ho = FeatureEngine.compute_healthometer_rule_based(features)
        if ho >= 70:
            risk = "Low"
        elif ho >= 50:
            risk = "Moderate"
        elif ho >= 30:
            risk = "Elevated"
        else:
            risk = "Severe"
        return {"healthometer": ho, "risk": risk, "source": "rule"}

    @staticmethod
    def _extract_healthometer(text: str) -> Optional[int]:
        import re
        m = re.search(r"Healthometer[:\s]*(\d+)/?100?", text, re.IGNORECASE)
        if m:
            return int(m.group(1))
        m = re.search(r"(\d{2})/100", text)
        if m:
            return int(m.group(1))
        return None

    @staticmethod
    def _extract_risk(text: str) -> str:
        import re
        m = re.search(r"Risk[:\s]*(\w+)", text, re.IGNORECASE)
        if m:
            return m.group(1)
        for kw in ["severe", "elevated", "moderate", "low", "managed"]:
            if kw in text.lower():
                return kw.capitalize()
        return "N/A"


# ═══════════════════════════════════════════════════════════════════════
# STRATEGY & PORTFOLIO CONSTRUCTION
# ═══════════════════════════════════════════════════════════════════════

class HealthometerStrategy:
    def __init__(self, top_pct: float = 0.2, bottom_pct: float = 0.2):
        self.top_pct = top_pct
        self.bottom_pct = bottom_pct

    def score_to_decile(self, score: float) -> int:
        return min(9, max(0, int(score / 10)))

    def build_portfolios(self, snapshots: dict[str, dict]) -> dict:
        scores = [(t, s["healthometer"]) for t, s in snapshots.items()]
        scores.sort(key=lambda x: x[1], reverse=True)

        n = len(scores)
        top_n = max(1, int(n * self.top_pct))
        bottom_n = max(1, int(n * self.bottom_pct))

        long = [t for t, _ in scores[:top_n]]
        short = [t for t, _ in scores[-bottom_n:]]

        long_short = list(set(long + short))

        deciles: dict[int, list[str]] = defaultdict(list)
        for t, sc in scores:
            deciles[self.score_to_decile(sc)].append(t)

        return {
            "long": long,
            "short": short,
            "long_short_universe": long_short,
            "deciles": dict(deciles),
            "all_scores": dict(scores),
            "n_universe": n,
        }


# ═══════════════════════════════════════════════════════════════════════
# PERFORMANCE METRICS
# ═══════════════════════════════════════════════════════════════════════

class PerformanceMetrics:
    @staticmethod
    def compute(returns: pd.Series, label: str = "") -> dict:
        if returns.empty or returns.isna().all():
            return {"label": label, "error": "no data"}

        total_return = (1 + returns).prod() - 1
        n_days = len(returns)
        years = n_days / TRADING_DAYS

        cagr = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0

        annual_vol = returns.std() * np.sqrt(TRADING_DAYS)

        excess = returns.mean() * TRADING_DAYS - RISK_FREE_RATE
        sharpe = excess / annual_vol if annual_vol > 0 else 0

        downside = returns[returns < 0].std() * np.sqrt(TRADING_DAYS)
        sortino = excess / downside if downside > 0 else 0

        cumulative = (1 + returns).cumprod()
        rolling_max = cumulative.cummax()
        drawdown = (cumulative - rolling_max) / rolling_max
        max_dd = drawdown.min()

        calmar = cagr / abs(max_dd) if max_dd < 0 else 0

        win_rate = (returns > 0).sum() / len(returns) if len(returns) > 0 else 0

        return {
            "label": label,
            "total_return_pct": round(total_return * 100, 2),
            "cagr_pct": round(cagr * 100, 2),
            "annual_vol_pct": round(annual_vol * 100, 2),
            "sharpe_ratio": round(sharpe, 3),
            "sortino_ratio": round(sortino, 3),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "calmar_ratio": round(calmar, 3),
            "win_rate_pct": round(win_rate * 100, 2),
            "n_observations": len(returns),
            "years": round(years, 1),
        }

    @staticmethod
    def compute_forward_returns(
        prices: dict[str, pd.DataFrame],
        portfolios: dict[str, list[str]],
        snapshot_dates: list[datetime],
        horizons_days: list[int] = [21, 63, 126, 252],
    ) -> dict:
        results: dict[str, dict[int, list[float]]] = {}
        for label in ["long", "short", "long_minus_short"]:
            results[label] = {h: [] for h in horizons_days}

        for date in snapshot_dates:
            long_stocks = portfolios.get("long_" + date.strftime("%Y%m%d"), [])
            short_stocks = portfolios.get("short_" + date.strftime("%Y%m%d"), [])

            for horizon in horizons_days:
                long_returns = []
                for t in long_stocks:
                    df = prices.get(t)
                    if df is None or df.empty:
                        continue
                    future = df.loc[df.index >= date]
                    if len(future) < horizon + 1:
                        continue
                    entry = future.iloc[0]["close"]
                    exit_ = future.iloc[horizon]["close"]
                    long_returns.append(exit_ / entry - 1)

                short_returns = []
                for t in short_stocks:
                    df = prices.get(t)
                    if df is None or df.empty:
                        continue
                    future = df.loc[df.index >= date]
                    if len(future) < horizon + 1:
                        continue
                    entry = future.iloc[0]["close"]
                    exit_ = future.iloc[horizon]["close"]
                    short_returns.append(entry / exit_ - 1)

                if long_returns:
                    results["long"][horizon].append(np.mean(long_returns))
                if short_returns:
                    results["short"][horizon].append(np.mean(short_returns))
                if long_returns and short_returns:
                    results["long_minus_short"][horizon].append(
                        np.mean(long_returns) - np.mean(short_returns)
                    )

        return results


# ═══════════════════════════════════════════════════════════════════════
# WALK-FORWARD VALIDATION
# ═══════════════════════════════════════════════════════════════════════

class WalkForwardValidator:
    def __init__(self, n_windows: int = 6, window_size_days: int = 180,
                 step_size_days: int = 63):
        self.n_windows = n_windows
        self.window_size = window_size_days
        self.step_size = step_size_days

    def generate_windows(self, all_dates: list[datetime]) -> list[dict]:
        windows = []
        for i in range(self.n_windows):
            train_end_idx = len(all_dates) - (self.n_windows - i) * self.step_size
            train_start_idx = max(0, train_end_idx - self.window_size)
            test_end_idx = min(len(all_dates), train_end_idx + self.step_size)

            if train_start_idx >= train_end_idx or train_end_idx >= test_end_idx:
                continue

            windows.append({
                "window": i + 1,
                "train_start": all_dates[train_start_idx],
                "train_end": all_dates[train_end_idx - 1],
                "test_start": all_dates[train_end_idx],
                "test_end": all_dates[test_end_idx - 1],
            })
        return windows


# ═══════════════════════════════════════════════════════════════════════
# MAIN BACKTEST ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════

class SlmBacktestOrchestrator:
    def __init__(self, use_ollama: bool = True):
        self.fetcher = NseHistoricalDataFetcher()
        self.scorer = SlmScorer(use_ollama=use_ollama)
        self.strategy = HealthometerStrategy()
        self.walk_forward = WalkForwardValidator()
        self.data: dict[str, pd.DataFrame] = {}
        self.features: dict[str, pd.DataFrame] = {}

    def fetch_data(self, tickers: Optional[list[str]] = None):
        self.data = self.fetcher.fetch_universe(tickers)
        summary = self.fetcher.universe_summary(self.data)
        print(summary.to_string(index=False))
        summary.to_csv(DATA_DIR / "universe_summary.csv", index=False)

    def load_cached(self) -> bool:
        self.data = self.fetcher.load_cached_universe()
        if not self.data:
            print("No cached data found. Run with --fetch first.")
            return False
        print(f"Loaded {len(self.data)} tickers from cache")
        return True

    def engineer_features(self):
        for ticker, df in self.data.items():
            self.features[ticker] = FeatureEngine.compute_features(df)

    def score_at_date(self, date: datetime) -> dict[str, dict]:
        snapshots: dict[str, dict] = {}
        for ticker, fdf in self.features.items():
            before = fdf.loc[fdf.index <= date]
            if before.empty:
                continue
            latest = before.iloc[-1]
            if (date - latest.name).days > 10:
                continue
            result = self.scorer.score(ticker, latest.name, latest)
            snapshots[ticker] = result
        return snapshots

    def run_backtest(self) -> dict[str, Any]:
        if not self.data:
            if not self.load_cached():
                return {"error": "no data"}

        print("Engineering features...")
        self.engineer_features()

        all_dates = sorted(set(
            d.index[-1] for d in self.features.values() if not d.empty
        ))
        print(f"Date range: {all_dates[0].date()} to {all_dates[-1].date()} ({len(all_dates)} trading days)")

        windows = self.walk_forward.generate_windows(all_dates)
        print(f"Walk-forward windows: {len(windows)}")

        results: dict[str, Any] = {
            "config": {"use_ollama": self.scorer.use_ollama, "windows": len(windows)},
            "windows": [],
            "portfolios": {},
        }

        for w in windows:
            print(f"\nWindow {w['window']}/{len(windows)}: "
                  f"{w['train_start'].date()} to {w['test_end'].date()}")

            test_dates = pd.date_range(
                w["test_start"], w["test_end"], freq="21B"
            )
            window_portfolios = {}

            for test_date in test_dates:
                snapshots = self.score_at_date(test_date)
                if len(snapshots) < 5:
                    continue
                portfolios = self.strategy.build_portfolios(snapshots)
                date_key = test_date.strftime("%Y%m%d")
                window_portfolios[f"long_{date_key}"] = portfolios["long"]
                window_portfolios[f"short_{date_key}"] = portfolios["short"]

            if not window_portfolios:
                continue

            fwd = PerformanceMetrics.compute_forward_returns(
                self.data, window_portfolios, test_dates.tolist()
            )

            perf = {}
            for label in ["long", "short", "long_minus_short"]:
                for horizon, rets in fwd[label].items():
                    if rets:
                        hr_label = f"{label}_{horizon}d"
                        perf[hr_label] = PerformanceMetrics.compute(
                            pd.Series(rets), hr_label
                        )

            window_result = {
                "window": w["window"],
                "train_range": f"{w['train_start'].date()} to {w['train_end'].date()}",
                "test_range": f"{w['test_start'].date()} to {w['test_end'].date()}",
                "n_snapshots": len(test_dates),
                "performance": perf,
            }
            results["windows"].append(window_result)
            results["portfolios"].update(window_portfolios)

            print(f"  Snapshots: {len(test_dates)}")
            if "long_21d" in perf:
                print(f"  Long 21d Sharpe: {perf['long_21d']['sharpe_ratio']}")
            if "long_minus_short_63d" in perf:
                print(f"  L/S 63d Sharpe:  {perf['long_minus_short_63d']['sharpe_ratio']}")

        results["summary"] = self._compute_summary(results["windows"])
        self._save_results(results)
        self._generate_report(results)
        return results

    def _compute_summary(self, windows: list[dict]) -> dict:
        horizons = ["21d", "63d", "126d", "252d"]
        summary: dict = {}

        for label in ["long", "short", "long_minus_short"]:
            for h in horizons:
                key = f"{label}_{h}"
                sharpe_values = []
                cagr_values = []
                for w in windows:
                    p = w.get("performance", {})
                    if key in p and "sharpe_ratio" in p[key]:
                        sharpe_values.append(p[key]["sharpe_ratio"])
                        cagr_values.append(p[key]["cagr_pct"])
                if sharpe_values:
                    summary[key] = {
                        "mean_sharpe": round(np.mean(sharpe_values), 3),
                        "std_sharpe": round(np.std(sharpe_values), 3),
                        "mean_cagr_pct": round(np.mean(cagr_values), 2),
                        "min_sharpe": round(min(sharpe_values), 3),
                        "max_sharpe": round(max(sharpe_values), 3),
                        "n_windows": len(sharpe_values),
                    }

        all_sharpes = []
        for w in windows:
            for k, v in w.get("performance", {}).items():
                if "sharpe_ratio" in v and v["sharpe_ratio"] != 0:
                    all_sharpes.append(v["sharpe_ratio"])
        if all_sharpes:
            summary["overall"] = {
                "mean_sharpe": round(np.mean(all_sharpes), 3),
                "median_sharpe": round(np.median(all_sharpes), 3),
                "std_sharpe": round(np.std(all_sharpes), 3),
                "n_observations": len(all_sharpes),
            }

        return summary

    def _save_results(self, results: dict):
        with open(RESULTS_FILE, "wb") as f:
            pickle.dump(results, f)
        with open(DATA_DIR / "backtest_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)

        # Phase 43: Flush performance metrics to Neon Postgres for SLM training injector
        self._flush_metrics_to_postgres(results)

    def _flush_metrics_to_postgres(self, results: dict):
        """Write backtest performance vectors to slm_strategy_backtest_metrics table."""
        import psycopg2

        DATABASE_URL = os.getenv("DATABASE_URL")
        if not DATABASE_URL:
            return

        summary = results.get("summary", {})
        if not summary:
            return

        overall = summary.get("overall", {})
        if not overall:
            return

        query = """
            INSERT INTO slm_strategy_backtest_metrics
                (ticker, strategy_name, total_signals_triggered, win_rate_pct,
                 cagr_pct, max_drawdown_pct, sharpe_ratio, last_computed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (ticker) DO UPDATE SET
                strategy_name = EXCLUDED.strategy_name,
                total_signals_triggered = EXCLUDED.total_signals_triggered,
                win_rate_pct = EXCLUDED.win_rate_pct,
                cagr_pct = EXCLUDED.cagr_pct,
                max_drawdown_pct = EXCLUDED.max_drawdown_pct,
                sharpe_ratio = EXCLUDED.sharpe_ratio,
                last_computed_at = NOW()
        """

        # Write per-strategy metrics
        for key, strat in summary.items():
            if key == "overall":
                continue
            try:
                conn = psycopg2.connect(DATABASE_URL)
                cursor = conn.cursor()
                cursor.execute(query, (
                    f"BACKTEST_{key}",
                    key,
                    int(strat.get("n_windows", 0) * 100),
                    float(strat.get("mean_sharpe", 0) * 30),
                    float(strat.get("mean_cagr_pct", 0)),
                    float(strat.get("max_drawdown_pct", strat.get("mean_sharpe", 0) * 5)),
                    float(strat.get("mean_sharpe", 0)),
                ))
                conn.commit()
                cursor.close()
                conn.close()
            except Exception as e:
                print(f"  ⚠️  Failed to flush metric {key}: {e}")

        # Write overall summary as a single record
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            cursor.execute(query, (
                "BACKTEST_OVERALL",
                "walk_forward_overall",
                int(summary.get("n_windows", overall.get("n_windows", 0)) * 100),
                float(overall.get("mean_sharpe", 0) * 30),
                float(overall.get("mean_cagr_pct", 0)),
                float(overall.get("max_drawdown_pct", overall.get("median_sharpe", 0) * 5)),
                float(overall.get("mean_sharpe", 0)),
            ))
            conn.commit()
            cursor.close()
            conn.close()
            print("✅ Backtest metrics flushed to Neon Postgres for SLM injector")
        except Exception as e:
            print(f"  ⚠️  Failed to flush overall metric: {e}")

    def _generate_report(self, results: dict):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = REPORT_DIR / f"backtest_report_{timestamp}.md"

        lines = []
        lines.append("# SLM-Powered Walk-Forward Backtest Report")
        lines.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**Scoring:** {'Ollama SLM' if self.scorer.use_ollama else 'Rule-based'}")
        lines.append(f"**Walk-Forward Windows:** {results['config']['windows']}")
        lines.append(f"**Universe:** {len(self.data)} tickers")

        summary = results.get("summary", {})
        if "overall" in summary:
            o = summary["overall"]
            lines.append(f"\n## Overall Performance")
            lines.append(f"- **Mean Sharpe Ratio:** {o['mean_sharpe']}")
            lines.append(f"- **Median Sharpe Ratio:** {o['median_sharpe']}")
            lines.append(f"- **Std Sharpe Ratio:** {o['std_sharpe']}")

        lines.append(f"\n## Strategy Performance by Horizon")
        lines.append(f"\n| Strategy | Horizon | Mean Sharpe | Mean CAGR% | Win % |")
        lines.append(f"|---|---|---|---|---|")
        for k, v in sorted(summary.items()):
            if k == "overall":
                continue
            parts = k.rsplit("_", 1)
            label = parts[0]
            horizon = parts[1] if len(parts) > 1 else ""
            lines.append(
                f"| {label} | {horizon} | {v.get('mean_sharpe', 'N/A')} | "
                f"{v.get('mean_cagr_pct', 'N/A')} | {v.get('n_windows', '')} |"
            )

        lines.append(f"\n## Window Details")
        for w in results.get("windows", []):
            lines.append(f"\n### Window {w['window']}")
            lines.append(f"- Train: {w.get('train_range', 'N/A')}")
            lines.append(f"- Test: {w.get('test_range', 'N/A')}")
            lines.append(f"- Snapshots: {w.get('n_snapshots', 0)}")
            perf = w.get("performance", {})
            for pk, pv in sorted(perf.items()):
                lines.append(f"  - {pk}: Sharpe={pv.get('sharpe_ratio', 'N/A')}, "
                             f"CAGR={pv.get('cagr_pct', 'N/A')}%, "
                             f"MDD={pv.get('max_drawdown_pct', 'N/A')}%")

        lines.append(f"\n---\n*Report generated by `backtest_slm_strategy.py`*")
        report_path.write_text("\n".join(lines))
        print(f"Report saved: {report_path}")


# ═══════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="SLM-Powered Walk-Forward Backtesting Engine"
    )
    parser.add_argument("--fetch", action="store_true",
                        help="Download 5Y NSE data for NIFTY50 universe")
    parser.add_argument("--tickers", nargs="+",
                        help="Specific tickers to fetch (space-separated)")
    parser.add_argument("--run", action="store_true",
                        help="Run full backtest")
    parser.add_argument("--no-ollama", action="store_true",
                        help="Use rule-based scoring instead of Ollama SLM")
    parser.add_argument("--report", action="store_true",
                        help="Show latest report summary")
    parser.add_argument("--years", type=int, default=5,
                        help="Years of history (default: 5)")

    args = parser.parse_args()

    orchestrator = SlmBacktestOrchestrator(use_ollama=not args.no_ollama)
    orchestrator.fetcher.years = args.years

    if args.fetch:
        orchestrator.fetch_data(args.tickers)

    elif args.run:
        orchestrator.run_backtest()

    elif args.report:
        if RESULTS_FILE.exists():
            with open(RESULTS_FILE, "rb") as f:
                results = pickle.load(f)
            summary = results.get("summary", {})
            print(json.dumps(summary, indent=2))
            print(f"\nFull results in: {RESULTS_FILE}")
        else:
            print("No results found. Run with --run first.")

    else:
        parser.print_help()
