"""Live news + geopolitical context for PSE analysis via Google News RSS.
No API key required, no scraping ToS violation (RSS is a public feed)."""
import feedparser
import time
from datetime import datetime
from urllib.parse import quote_plus

_CACHE_TTL = 300  # 5 min — news doesn't need to be fetched every call
_cache: dict[str, tuple[float, list]] = {}


def _fetch_rss(query: str, limit: int = 8) -> list[dict]:
    cache_key = query
    now = time.time()
    if cache_key in _cache and now - _cache[cache_key][0] < _CACHE_TTL:
        return _cache[cache_key][1]

    url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-PH&gl=PH&ceid=PH:en"
    try:
        feed = feedparser.parse(url)
        items = [
            {
                "title": e.title,
                "source": e.get("source", {}).get("title", "") if hasattr(e, "source") else "",
                "published": e.get("published", ""),
                "link": e.get("link", ""),
            }
            for e in feed.entries[:limit]
        ]
    except Exception:
        items = []

    _cache[cache_key] = (now, items)
    return items


def get_stock_news(ticker: str, company_name: str = "", limit: int = 5) -> list[dict]:
    """Recent news for a specific PSE stock."""
    q = f"{company_name or ticker} PSE stock Philippines"
    return _fetch_rss(q, limit)


def get_market_news(limit: int = 8) -> list[dict]:
    """General PSE / Philippine stock market news."""
    return _fetch_rss("Philippine Stock Exchange PSEi market", limit)


def get_geopolitical_context(limit: int = 8) -> list[dict]:
    """Geopolitical events likely to move Philippine markets."""
    return _fetch_rss("Philippines economy geopolitics ASEAN trade", limit)


def get_full_context(ticker: str = "", company_name: str = "") -> dict:
    """One-shot bundle: market news + geopolitics + (optionally) stock-specific news."""
    result = {
        "market_news": get_market_news(5),
        "geopolitical": get_geopolitical_context(5),
        "fetched_at": datetime.now().isoformat(),
    }
    if ticker:
        result["stock_news"] = get_stock_news(ticker, company_name, 5)
    return result


if __name__ == "__main__":
    import json
    print(json.dumps(get_full_context("BDO", "BDO Unibank"), indent=2))
