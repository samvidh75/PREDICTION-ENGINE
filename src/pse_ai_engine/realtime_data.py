"""Real-time PSE market data.

IMPORTANT: yfinance/.PS suffix does NOT carry real PSE-listed prices — Yahoo only
has US OTC ADR proxies (e.g. BDOUY) for a handful of PSE names, at a different
price/currency than the actual PSE-listed stock. Verified by direct query during
build. Using the phisix mirror (community-run pass-through of PSE's own EOD/live
ticker feed) instead, which returns real PHP-denominated PSE prices.

Historical OHLCV for technicals (RSI/SMA) still comes from the local training
data (pse_comprehensive_training_96k.jsonl) since phisix only exposes current
price + %change + volume, not full history.
"""
import json
import time
import urllib.request
from datetime import datetime

PHISIX_BASE = "https://phisix-api3.appspot.com/stocks"

PSE_TICKERS = {
    "BDO": "BDO Unibank", "BPI": "Bank of the Philippine Islands", "MBT": "Metrobank",
    "AC": "Ayala Corporation", "ALI": "Ayala Land", "SM": "SM Investments",
    "SMPH": "SM Prime Holdings", "MER": "Meralco", "PLDT": "PLDT Inc", "TEL": "PLDT Inc",
    "GLO": "Globe Telecom", "JFC": "Jollibee Foods", "AEV": "Aboitiz Equity Ventures",
    "URC": "Universal Robina", "ICT": "Intl Container Terminal Services",
    "MPI": "Metro Pacific Investments", "GTCAP": "GT Capital Holdings",
    "SECB": "Security Bank", "RLC": "Robinsons Land", "DMC": "DMCI Holdings",
    "AGI": "Alliance Global Group",
}

_CACHE_TTL = 60  # seconds
_cache: dict[str, tuple[float, dict]] = {}


def _fetch_json(url: str, timeout: float = 6.0) -> dict | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def get_live_quote(ticker: str) -> dict:
    """Real current PSE price via phisix (community mirror of PSE's live feed). Cached 60s."""
    key = ticker.upper().replace(".PS", "").replace(".PSE", "")
    now = time.time()
    if key in _cache and now - _cache[key][0] < _CACHE_TTL:
        return _cache[key][1]

    data = _fetch_json(f"{PHISIX_BASE}/{key.lower()}.json")
    if not data or not data.get("stocks"):
        result = {
            "ticker": key, "error": "no data from PSE feed", "stale": True,
            "fetched_at": datetime.now().isoformat(),
        }
    else:
        s = data["stocks"][0]
        result = {
            "ticker": key,
            "name": s.get("name", PSE_TICKERS.get(key, key)),
            "price": s["price"]["amount"],
            "currency": s["price"]["currency"],
            "change_pct": s.get("percentChange"),
            "volume": s.get("volume"),
            "as_of": data.get("as_of"),
            "fetched_at": datetime.now().isoformat(),
            "source": "PSE (phisix feed)",
            "stale": False,
        }

    _cache[key] = (now, result)
    return result


def get_market_snapshot(limit: int = 500) -> list[dict]:
    """Full PSE market snapshot — every listed security, current price + %change."""
    data = _fetch_json(f"{PHISIX_BASE}.json", timeout=15)
    if not data:
        return []
    out = []
    for s in data.get("stocks", [])[:limit]:
        out.append({
            "symbol": s.get("symbol"),
            "name": s.get("name"),
            "price": s.get("price", {}).get("amount"),
            "change_pct": s.get("percentChange"),
            "volume": s.get("volume"),
        })
    return out


def get_movers(top_n: int = 5) -> dict:
    """Top gainers/losers/most-active across the whole PSE right now."""
    snapshot = get_market_snapshot()
    valid = [s for s in snapshot if s.get("change_pct") is not None and s.get("volume", 0) > 0]
    gainers = sorted(valid, key=lambda s: s["change_pct"], reverse=True)[:top_n]
    losers = sorted(valid, key=lambda s: s["change_pct"])[:top_n]
    most_active = sorted(valid, key=lambda s: s.get("volume", 0), reverse=True)[:top_n]
    return {"gainers": gainers, "losers": losers, "most_active": most_active,
            "fetched_at": datetime.now().isoformat()}


def is_known_pse_ticker(ticker: str) -> bool:
    key = ticker.upper().replace(".PS", "").replace(".PSE", "")
    if key in PSE_TICKERS:
        return True
    # Fall back to live lookup for tickers not in the curated map (smaller/less common names)
    q = get_live_quote(key)
    return not q.get("stale", True)


if __name__ == "__main__":
    print(json.dumps(get_live_quote("BDO"), indent=2))
    print(json.dumps(get_live_quote("ALI"), indent=2))
    movers = get_movers(3)
    print(json.dumps(movers, indent=2))
