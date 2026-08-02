"""
NSE India client — uses nsepython (native) with custom REST fallback.
Rate-limited, cached. Fetches live quotes, option chains, indices.
"""
import json
import time
import random
from datetime import datetime
from pathlib import Path
from typing import Optional

CACHE_DIR = Path(__file__).parent / ".nse_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ── Try native nsepython first ──────────────────────────────────
_HAS_NSEPYTHON = False
try:
    from nsepython import (
        nse_eq,
        nse_quote,
        option_chain as nse_oc,
        nse_get_index_quote,
        nse_quote_ltp,
        nse_optionchain_ltp,
        nse_expirydetails_by_symbol,
    )
    _HAS_NSEPYTHON = True
except ImportError:
    pass


def _rate_limit():
    time.sleep(random.uniform(2.0, 5.0))


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key.replace('/', '_').replace('?', '_')}.json"


def _read_cache(key: str, max_age_sec: int = 30) -> Optional[dict]:
    p = _cache_path(key)
    if p.exists() and (time.time() - p.stat().st_mtime) < max_age_sec:
        try: return json.loads(p.read_text())
        except: return None
    return None


def _write_cache(key: str, data: dict):
    _cache_path(key).write_text(json.dumps(data, default=str))


# ── Public API ──────────────────────────────────────────────────

def live_quote(symbol: str) -> dict:
    """Live NSE quote via nsepython → nse_eq / nse_quote."""
    cache_key = f"quote_{symbol}"
    cached = _read_cache(cache_key, max_age_sec=10)
    if cached:
        return cached

    _rate_limit()
    result = {"symbol": symbol.upper(), "timestamp": datetime.now().isoformat()}

    try:
        if _HAS_NSEPYTHON:
            q = nse_eq(symbol.upper())
            result.update({
                "lastPrice": q.get("lastPrice"),
                "change": q.get("change"),
                "pChange": q.get("pChange"),
                "open": q.get("open"),
                "dayHigh": q.get("dayHigh"),
                "dayLow": q.get("dayLow"),
                "volume": q.get("totalTradedVolume"),
            })
        else:
            import requests as req
            s = req.Session()
            s.headers.update({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36",
                "Accept": "application/json",
            })
            s.get("https://www.nseindia.com", timeout=10)
            time.sleep(2)
            r = s.get(
                f"https://www.nseindia.com/api/quote-equity?symbol={symbol.upper()}",
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
            pi = data.get("priceInfo", {})
            result.update({
                "lastPrice": pi.get("lastPrice"),
                "change": pi.get("change"),
                "pChange": pi.get("pChange"),
                "open": pi.get("open"),
                "dayHigh": pi.get("intraDayHighLow", {}).get("max"),
                "dayLow": pi.get("intraDayHighLow", {}).get("min"),
                "volume": pi.get("totalTradedVolume"),
            })
    except Exception as e:
        result["error"] = str(e)

    _write_cache(cache_key, result)
    return result


def option_chain(symbol: str, expiry_date: Optional[str] = None) -> list[dict]:
    """NSE option chain via nsepython → option_chain()."""
    cache_key = f"oc_{symbol}_{expiry_date or 'all'}"
    cached = _read_cache(cache_key, max_age_sec=30)
    if cached:
        return cached.get("records", [])

    _rate_limit()
    result = []
    try:
        if _HAS_NSEPYTHON:
            raw = nse_oc(symbol.upper(), expiry_date or "")
            for rec in raw:
                strike = rec.get("strikePrice")
                expiry = rec.get("expiryDate")
                entry = {"strikePrice": strike, "expiryDate": expiry, "underlying": symbol.upper()}
                for side in ("CE", "PE"):
                    leg = rec.get(side)
                    if leg:
                        entry[side.lower()] = {
                            "lastPrice": leg.get("lastPrice"),
                            "impliedVolatility": leg.get("impliedVolatility"),
                            "openInterest": leg.get("openInterest"),
                            "volume": leg.get("totalTradedVolume"),
                            "bidQty": leg.get("bidQty"),
                            "bidPrice": leg.get("bidPrice"),
                            "askPrice": leg.get("askPrice"),
                            "askQty": leg.get("askQty"),
                        }
                if "ce" in entry or "pe" in entry:
                    result.append(entry)
        else:
            import requests as req
            s = req.Session()
            s.headers.update({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36",
                "Accept": "application/json",
            })
            s.get("https://www.nseindia.com", timeout=10)
            time.sleep(2)
            params = {"symbol": symbol.upper()}
            if expiry_date:
                params["expiryDate"] = expiry_date
            r = s.get("https://www.nseindia.com/api/option-chain-equities", params=params, timeout=15)
            r.raise_for_status()
            data = r.json()
            for rec in data.get("records", {}).get("data", []):
                strike = rec.get("strikePrice")
                expiry = rec.get("expiryDate")
                entry = {"strikePrice": strike, "expiryDate": expiry, "underlying": symbol.upper()}
                for side in ("CE", "PE"):
                    leg = rec.get(side)
                    if leg:
                        entry[side.lower()] = {
                            key: leg.get(key)
                            for key in ("lastPrice", "impliedVolatility", "openInterest",
                                       "totalTradedVolume", "bidQty", "bidPrice", "askPrice", "askQty")
                        }
                        if entry[side.lower()].get("totalTradedVolume") is not None:
                            entry[side.lower()]["volume"] = entry[side.lower()].pop("totalTradedVolume")
                if "ce" in entry or "pe" in entry:
                    result.append(entry)
    except Exception as e:
        return []

    _write_cache(cache_key, {"records": result, "fetchedAt": datetime.now().isoformat()})
    return result


def nifty_indices() -> dict:
    """NSE indices via nsepython → nse_get_index_quote or custom."""
    cache_key = "indices"
    cached = _read_cache(cache_key, max_age_sec=10)
    if cached:
        return cached

    _rate_limit()
    result = {}
    try:
        if _HAS_NSEPYTHON:
            raw = nse_get_index_quote()
            for idx in raw:
                name = idx.get("index")
                result[name] = {
                    "index": name,
                    "last": idx.get("last"),
                    "change": idx.get("change"),
                    "pChange": idx.get("percentChange"),
                    "open": idx.get("open"),
                    "high": idx.get("high"),
                    "low": idx.get("low"),
                }
        else:
            import requests as req
            r = req.get(
                "https://www.nseindia.com/api/allIndices",
                headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
                timeout=15,
            )
            r.raise_for_status()
            for idx in r.json().get("data", []):
                result[idx["index"]] = {
                    "index": idx["index"],
                    "last": idx.get("last"),
                    "change": idx.get("change"),
                    "pChange": idx.get("percentChange"),
                    "open": idx.get("open"),
                    "high": idx.get("high"),
                    "low": idx.get("low"),
                }
    except Exception:
        pass

    _write_cache(cache_key, result)
    return result


def expiry_dates(symbol: str) -> list[str]:
    """Get expiry dates via nsepython → nse_expirydetails_by_symbol."""
    cache_key = f"expiry_{symbol}"
    cached = _read_cache(cache_key, max_age_sec=3600)
    if cached:
        return cached.get("expiries", [])

    _rate_limit()
    expiries = []
    try:
        if _HAS_NSEPYTHON:
            raw = nse_expirydetails_by_symbol(symbol.upper())
            if isinstance(raw, list):
                expiries = sorted(set(
                    e.get("EXPIRY_DT") or e.get("expiryDate") or str(e)
                    for e in raw
                    if e
                ))
            elif isinstance(raw, dict):
                expiries = sorted(set(
                    raw.get("EXPIRY_DT") or raw.get("expiryDate") or ""
                ))
        else:
            import requests as req
            r = req.get(
                f"https://www.nseindia.com/api/option-chain-equities?symbol={symbol.upper()}",
                headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
                timeout=15,
            )
            r.raise_for_status()
            expiries = sorted(set(
                e.get("expiryDate") for e in r.json().get("records", {}).get("data", [])
                if e.get("expiryDate")
            ))
    except Exception:
        pass

    _write_cache(cache_key, {"expiries": expiries})
    return expiries


def equity_list() -> list[dict]:
    """Full NSE equity list (cached daily)."""
    cache_key = "equity_list"
    cached = _read_cache(cache_key, max_age_sec=86400)
    if cached:
        return cached.get("securities", [])

    _rate_limit()
    securities = []
    try:
        if _HAS_NSEPYTHON:
            from nsepython import nse_eq_symbols
            symbols = nse_eq_symbols()
            securities = [{"symbol": s} for s in symbols]
        else:
            import requests as req
            r = req.get(
                "https://www.nseindia.com/api/equity-master",
                headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
                timeout=30,
            )
            r.raise_for_status()
            securities = r.json().get("data", [])
    except Exception:
        pass

    _write_cache(cache_key, {"securities": securities, "fetchedAt": datetime.now().isoformat()})
    return securities
