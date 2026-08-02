"""
yfinance wrapper with caching, rate limiting, and pandas_ta indicators.

Fetches once, caches locally in Parquet/CSV.
On refresh: only fetches latest 5 days and appends.
"""
import time
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

# ── Local cache dir ─────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / ".market_cache"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Rate limiting ───────────────────────────────────────────────
MIN_PAUSE = 2.0
MAX_PAUSE = 5.0

def _pause():
    time.sleep(random.uniform(MIN_PAUSE, MAX_PAUSE))


# ── User-Agent for yfinance (no caching session — yfinance manages its own) ─
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/129.0.0.0 Safari/537.36"
)


def _cache_file(symbol: str) -> Path:
    return DATA_DIR / f"{symbol.upper()}.parquet"


def _has_cache(symbol: str) -> bool:
    return _cache_file(symbol).exists()


def _load_cache(symbol: str) -> Optional[pd.DataFrame]:
    p = _cache_file(symbol)
    if p.exists():
        try:
            return pd.read_parquet(p)
        except Exception:
            return None
    return None


def _save_cache(symbol: str, df: pd.DataFrame):
    df.to_parquet(_cache_file(symbol))


# ── Public API ──────────────────────────────────────────────────

def get_historical(symbol: str, period: str = "1y") -> pd.DataFrame:
    """
    Get historical daily OHLCV data.
    
    First call fetches full period and caches.
    Subsequent calls fetch last 5 days, merge, save.
    """
    sym = f"{symbol.upper()}.NS"
    cached = _load_cache(symbol.upper())

    if cached is not None and not cached.empty:
        # Only fetch latest 5 trading days
        _pause()
        try:
            latest = yf.download(
                sym, period="5d", auto_adjust=True,
                progress=False,
            )
            if latest.empty:
                return cached
            # Flatten MultiIndex columns if needed
            if isinstance(latest.columns, pd.MultiIndex):
                latest.columns = [c[0].lower() for c in latest.columns]
            else:
                latest.columns = [c.lower() for c in latest.columns]
            latest.index = pd.to_datetime(latest.index)
            latest.index.name = "date"
            latest["ticker"] = symbol.upper()

            # Merge: keep old data, overwrite new dates
            combined = cached[~cached.index.isin(latest.index)]
            result = pd.concat([combined, latest]).sort_index()
            _save_cache(symbol.upper(), result)
            return result
        except Exception:
            return cached

    _pause()
    df = yf.download(
        sym, period=period, auto_adjust=True,
        progress=False,
    )
    if df.empty:
        return pd.DataFrame()

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0].lower() for c in df.columns]
    else:
        df.columns = [c.lower() for c in df.columns]
    df.index = pd.to_datetime(df.index)
    df.index.name = "date"
    df["ticker"] = symbol.upper()
    _save_cache(symbol.upper(), df)
    return df


def get_live_price(symbol: str) -> dict:
    """Get latest price + basic stats from yfinance (no history fetch)."""
    _pause()
    sym = f"{symbol.upper()}.NS"
    tk = yf.Ticker(sym)
    info = tk.info or {}
    fast = tk.fast_info
    return {
        "symbol": symbol.upper(),
        "price": getattr(fast, "last_price", None) or info.get("currentPrice"),
        "previousClose": info.get("previousClose"),
        "dayHigh": info.get("dayHigh"),
        "dayLow": info.get("dayLow"),
        "volume": info.get("volume"),
        "marketCap": info.get("marketCap"),
        "peRatio": info.get("trailingPE"),
        "timestamp": datetime.now().isoformat(),
    }


def get_indicators(symbol: str) -> pd.DataFrame:
    """
    Get historical data + computed indicators:
      - SMA-20, SMA-50, SMA-200
      - EMA-12, EMA-26, EMA-50, EMA-200
      - RSI-14
      - MACD (12,26,9)
      - Bollinger Bands (20,2)
      - ATR-14
    """
    df = get_historical(symbol, period="1y")
    if df.empty or len(df) < 50:
        return df

    c = df["close"].astype(float)

    # Simple Moving Averages
    df["sma_20"] = c.rolling(20).mean()
    df["sma_50"] = c.rolling(50).mean()
    df["sma_200"] = c.rolling(200).mean()

    # Exponential Moving Averages
    df["ema_12"] = c.ewm(span=12, adjust=False).mean()
    df["ema_26"] = c.ewm(span=26, adjust=False).mean()
    df["ema_50"] = c.ewm(span=50, adjust=False).mean()
    df["ema_200"] = c.ewm(span=200, adjust=False).mean()

    # RSI-14
    delta = c.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))

    # MACD
    ema12 = c.ewm(span=12, adjust=False).mean()
    ema26 = c.ewm(span=26, adjust=False).mean()
    df["macd"] = ema12 - ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]

    # Bollinger Bands
    bb_mid = c.rolling(20).mean()
    bb_std = c.rolling(20).std()
    df["bb_upper"] = bb_mid + 2 * bb_std
    df["bb_lower"] = bb_mid - 2 * bb_std
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / bb_mid

    # ATR-14
    high, low = df["high"].astype(float), df["low"].astype(float)
    tr = pd.concat([
        high - low,
        (high - c.shift()).abs(),
        (low - c.shift()).abs(),
    ], axis=1).max(axis=1)
    df["atr_14"] = tr.rolling(14).mean()

    return df


def ema_crossover(symbol: str, fast: int = 50, slow: int = 200) -> Optional[str]:
    """
    Check if fast-EMA crossed above (golden cross) or below (death cross) slow-EMA today.
    Returns: 'golden_cross', 'death_cross', or None.
    """
    df = get_historical(symbol, period="1y")
    if df.empty or len(df) < slow + 5:
        return None
    c = df["close"].astype(float)
    ema_fast = c.ewm(span=fast, adjust=False).mean()
    ema_slow = c.ewm(span=slow, adjust=False).mean()

    if len(ema_fast) < 2:
        return None
    prev_fast = ema_fast.iloc[-2]
    prev_slow = ema_slow.iloc[-2]
    curr_fast = ema_fast.iloc[-1]
    curr_slow = ema_slow.iloc[-1]

    if pd.isna(prev_fast) or pd.isna(prev_slow) or pd.isna(curr_fast) or pd.isna(curr_slow):
        return None

    if prev_fast <= prev_slow and curr_fast > curr_slow:
        return "golden_cross"
    if prev_fast >= prev_slow and curr_fast < curr_slow:
        return "death_cross"
    return None


def scan_ema_crossovers(tickers: list[str], fast: int = 50, slow: int = 200) -> list[dict]:
    """Scan a list of tickers for EMA crossovers today."""
    results = []
    for sym in tickers:
        signal = ema_crossover(sym, fast, slow)
        if signal:
            df = get_historical(sym, period="1y")
            last_close = df["close"].iloc[-1] if not df.empty and "close" in df else None
            results.append({
                "symbol": sym.upper(),
                "signal": signal,
                "lastPrice": float(last_close) if last_close is not None else None,
                "fastEMA": fast,
                "slowEMA": slow,
                "timestamp": datetime.now().isoformat(),
            })
    return results


def clear_cache(symbol: Optional[str] = None):
    """Delete cached parquet files. If symbol is None, clear all."""
    if symbol:
        p = _cache_file(symbol.upper())
        if p.exists():
            p.unlink()
    else:
        for p in DATA_DIR.glob("*.parquet"):
            p.unlink()
