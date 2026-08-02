"""
Screener.in CSV exports + BSE XBRL filing downloader.

Reads public Excel/CSV exports with pandas and structures data for DB upload.

Rate-limited with 3-5s pauses between requests.
"""
import time
import random
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Optional

import pandas as pd
import requests as req

CACHE_DIR = Path(__file__).parent / ".fundamental_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/129.0.0.0 Safari/537.36"
    ),
}

MIN_PAUSE = 3.0
MAX_PAUSE = 5.0


def _pause():
    time.sleep(random.uniform(MIN_PAUSE, MAX_PAUSE))


def _session() -> req.Session:
    s = req.Session()
    s.headers.update(HEADERS)
    return s


def _cache_path(key: str) -> Path:
    safe = key.replace("/", "_").replace("?", "_").replace(":", "_")
    return CACHE_DIR / f"{safe}.csv"


def _load_cache_csv(key: str, max_age_hours: int = 24) -> Optional[pd.DataFrame]:
    p = _cache_path(key)
    if not p.exists():
        return None
    age = time.time() - p.stat().st_mtime
    if age > max_age_hours * 3600:
        return None
    try:
        return pd.read_csv(p)
    except Exception:
        return None


def _save_cache_csv(key: str, df: pd.DataFrame):
    p = _cache_path(key)
    df.to_csv(p, index=False)


# ── Screener.in CSV export ──────────────────────────────────────

def screener_export(symbol: str) -> Optional[pd.DataFrame]:
    """
    Download Screener.in quarterly CSV for a symbol.
    
    URL pattern: https://www.screener.in/company/{symbol}/consolidated/
    
    Returns DataFrame with quarterly financials or None.
    """
    cache_key = f"screener_{symbol.upper()}"
    cached = _load_cache_csv(cache_key, max_age_hours=24)
    if cached is not None:
        return cached

    _pause()
    url = f"https://www.screener.in/company/{symbol.upper()}/consolidated/"
    s = _session()
    try:
        r = s.get(url, timeout=30)
        r.raise_for_status()
    except req.RequestException:
        return None

    # Screener.in doesn't expose direct CSV exports freely.
    # Parse the HTML tables into DataFrames.
    tables = pd.read_html(StringIO(r.text))
    if not tables:
        return None

    result = {}
    for table in tables:
        if "Quarter" in table.columns or "Year" in table.columns:
            table.insert(0, "symbol", symbol.upper())
            result[f"table_{len(result)}"] = table

    if result:
        df = pd.concat(result.values(), ignore_index=True)
        _save_cache_csv(cache_key, df)
        return df
    return None


# ── BSE Corporate filings (XBRL) ────────────────────────────────

def bse_corp_filings(symbol: str, num_filings: int = 10) -> list[dict]:
    """
    Fetch latest BSE corporate filings for a company.
    
    Uses BSE's public API: https://api.bseindia.com
    Returns list of filings with links to XBRL/PDF files.
    """
    cache_key = f"bse_filings_{symbol.upper()}"
    p = CACHE_DIR / f"{cache_key}.json"
    if p.exists():
        age = time.time() - p.stat().st_mtime
        if age < 3600:
            import json
            return json.loads(p.read_text())

    _pause()
    s = _session()
    s.headers.update({
        "Referer": "https://www.bseindia.com/",
        "Origin": "https://www.bseindia.com",
    })

    # BSE API endpoint for corporate announcements
    url = (
        f"https://api.bseindia.com/BseIndiaAPI/api/AnnSubSysGetData/"
        f"?strCat=-1&strPrevDate=&strPostDate=&strSearch=P&strToDate="
        f"&strFromDate=&strQuater=&strSegment=All&strSCrip={symbol.upper()}"
    )
    try:
        r = s.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []

    filings = []
    table = data.get("Table", [])
    for row in table[:num_filings]:
        filings.append({
            "symbol": symbol.upper(),
            "filingName": row.get("NEWS_DESC", ""),
            "filingDate": row.get("NEWS_DT", ""),
            "category": row.get("CATEGORYNAME", ""),
            "attachment": row.get("ATTACHMENTNAME", ""),
            "source": "BSE",
            "fetchedAt": datetime.now().isoformat(),
        })

    import json
    p.write_text(json.dumps(filings, default=str))
    return filings


# ── Parse quarterly P&L, balance sheet, ratios ──────────────────

def parse_screener_profit_loss(df: pd.DataFrame) -> pd.DataFrame:
    """Extract quarterly P&L rows from Screener.in DataFrame."""
    if df.empty:
        return df
    pl_rows = df[df.iloc[:, 0].astype(str).str.contains(
        "Sales|Expenses|Operating Profit|OPM|Net Profit", case=False, na=False
    )]
    return pl_rows


def parse_screener_balance_sheet(df: pd.DataFrame) -> pd.DataFrame:
    """Extract balance sheet rows."""
    if df.empty:
        return df
    bs_rows = df[df.iloc[:, 0].astype(str).str.contains(
        "Equity|Liabilities|Assets|Borrowings|Reserves", case=False, na=False
    )]
    return bs_rows


def parse_screener_ratios(df: pd.DataFrame) -> pd.DataFrame:
    """Extract ratio rows (PE, ROE, etc.)."""
    if df.empty:
        return df
    ratio_rows = df[df.iloc[:, 0].astype(str).str.contains(
        "Stock P/E|ROE|ROCE|EPS|Dividend|P/B|Market Cap", case=False, na=False
    )]
    return ratio_rows


def screener_ratios_summary(symbol: str) -> dict:
    """
    Get key ratios from Screener.in as a flat dict.
    Attempts structured JSON scrape then falls back to HTML parsing.
    """
    df = screener_export(symbol)
    if df is None or df.empty:
        return {}

    ratios = parse_screener_ratios(df)
    summary = {"symbol": symbol.upper(), "fetchedAt": datetime.now().isoformat()}

    for _, row in ratios.iterrows():
        label = str(row.iloc[0]).strip()
        # Take the latest quarter value (last non-NaN column)
        values = row.iloc[1:].dropna()
        if not values.empty:
            try:
                summary[label] = float(values.iloc[-1])
            except (ValueError, TypeError):
                summary[label] = str(values.iloc[-1])
    return summary


# ── BSE XBRL financial statements download ──────────────────────

def download_xbrl(url: str, save_dir: Optional[Path] = None) -> Optional[Path]:
    """
    Download an XBRL (XML) filing from BSE.
    Returns path to saved file.
    """
    if save_dir is None:
        save_dir = CACHE_DIR / "xbrl"
    save_dir.mkdir(parents=True, exist_ok=True)

    _pause()
    s = _session()
    try:
        r = s.get(url, timeout=60)
        r.raise_for_status()
    except req.RequestException:
        return None

    fname = url.split("/")[-1] or f"xbrl_{int(time.time())}.xml"
    fpath = save_dir / fname
    fpath.write_bytes(r.content)

    # Parse XML with pandas if it's financial data
    try:
        xml_df = pd.read_xml(fpath)
        csv_path = fpath.with_suffix(".csv")
        xml_df.to_csv(csv_path, index=False)
        return csv_path
    except Exception:
        return fpath


def screener_peers(symbol: str) -> list[dict]:
    """
    Get peer comparison data from Screener.in.
    Returns list of peer company dicts with ratios.
    """
    cache_key = f"peers_{symbol.upper()}"
    p = CACHE_DIR / f"{cache_key}.json"
    if p.exists():
        import json
        age = time.time() - p.stat().st_mtime
        if age < 86400:
            return json.loads(p.read_text())

    df = screener_export(symbol)
    if df is None or df.empty:
        return []

    # Peer table is typically the last table with "Company" column
    peers = []
    for _, row in df.iterrows():
        row_list = row.tolist()
        if any("Company" in str(c) for c in row_list):
            continue
        peers.append({
            "symbol": symbol.upper(),
            "peerData": row.to_dict(),
        })

    import json
    p.write_text(json.dumps(peers, default=str))
    return peers


def _json_safe(value):
    if isinstance(value, pd.DataFrame):
        return value.replace({pd.NA: None}).where(pd.notna(value), None).to_dict(orient="records")
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return value


def run_cli() -> int:
    parser = argparse.ArgumentParser(description="Screener.in + BSE filings helper")
    parser.add_argument("--symbol", default="RELIANCE", help="Indian symbol to fetch")
    parser.add_argument("--mode", choices=["screener", "bse", "both"], default="both", help="What to fetch")
    parser.add_argument("--output-dir", default=str(CACHE_DIR / "official"), help="Directory for JSON snapshots")
    parser.add_argument("--num-filings", type=int, default=10, help="Number of BSE filings to keep")
    parser.add_argument("--xbrl-url", default="", help="Optional BSE XBRL/PDF URL to download")
    args = parser.parse_args()

    symbol = args.symbol.upper().strip()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    payload: dict[str, object] = {"symbol": symbol, "fetchedAt": datetime.now().isoformat(), "mode": args.mode}

    if args.mode in ("screener", "both"):
        screener_df = screener_export(symbol)
        payload["screenerRatios"] = screener_ratios_summary(symbol)
        payload["screenerTables"] = _json_safe(screener_df) if screener_df is not None else None
        if screener_df is not None and not screener_df.empty:
            payload["profitLossRows"] = _json_safe(parse_screener_profit_loss(screener_df))
            payload["balanceSheetRows"] = _json_safe(parse_screener_balance_sheet(screener_df))
            payload["ratioRows"] = _json_safe(parse_screener_ratios(screener_df))

    if args.mode in ("bse", "both"):
        filings = bse_corp_filings(symbol, num_filings=args.num_filings)
        payload["bseFilings"] = filings

    if args.xbrl_url:
        downloaded = download_xbrl(args.xbrl_url, output_dir / "xbrl")
        payload["downloadedXbrlPath"] = str(downloaded) if downloaded else None

    out_path = output_dir / f"{symbol.lower()}_{args.mode}.json"
    out_path.write_text(json.dumps(payload, indent=2, default=str))
    print(json.dumps({"symbol": symbol, "mode": args.mode, "output": str(out_path)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(run_cli())
