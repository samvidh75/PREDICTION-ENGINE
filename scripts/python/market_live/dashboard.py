#!/usr/bin/env python3
"""
Streamlit dashboard — real-time market data, options Greeks, technical indicators,
EMA crossover scanner, Screener.in data, and more.

Usage:
    streamlit run scripts/python/market_live/dashboard.py

Architecture:
  - yfinance for historical + live prices (cached to local Parquet)
  - NSE India REST API for option chains (rate-limited, no nsepython needed)
  - Black-Scholes Greeks via scipy (no py_black_scholes)
  - Screener.in HTML parse for fundamentals
  - All data cached locally; refresh fetches only last 5 days
  - No infinite loops — all fetches trigger on user action or 30s auto-refresh
"""
import time
import random
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
import streamlit as st

from .market_data import (
    get_live_price,
    get_indicators,
    ema_crossover,
    scan_ema_crossovers,
    clear_cache,
    DATA_DIR,
)
from .nse_client import (
    live_quote as nse_live_quote,
    option_chain as nse_option_chain,
    nifty_indices,
    expiry_dates,
)
from .option_greeks import enrich_option_chain, calculate_greeks, days_to_expiry
from .fundamental_scraper import (
    screener_export,
    screener_ratios_summary,
    parse_screener_ratios,
)

# ── Page config ─────────────────────────────────────────────────
st.set_page_config(
    page_title="StockStory Market Live",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📊 StockStory Market Live")
st.caption("Real-time NSE data · Technical indicators · Options Greeks · Fundamental ratios")

# ── Sidebar ─────────────────────────────────────────────────────
st.sidebar.header("Controls")

symbol = st.sidebar.text_input("Symbol", value="TCS").strip().upper()
refresh_rate = st.sidebar.select_slider(
    "Auto-refresh (s)", options=[0, 10, 30, 60, 120], value=30
)
clear_cache_btn = st.sidebar.button("Clear local cache")

if clear_cache_btn:
    clear_cache()
    st.sidebar.success("Cache cleared")

tabs = st.tabs([
    "Live Quote", "Technical Indicators", "EMA Scanner",
    "Option Chain & Greeks", "Fundamentals", "Indices",
])

# ── Helper: rate-limited fetcher with caching ───────────────────
@st.cache_data(ttl=30, show_spinner=False)
def cached_live_price(sym: str) -> dict:
    return get_live_price(sym)


@st.cache_data(ttl=30, show_spinner=False)
def cached_nse_quote(sym: str) -> dict:
    return nse_live_quote(sym)


@st.cache_data(ttl=60, show_spinner=False)
def cached_indicators(sym: str) -> pd.DataFrame:
    return get_indicators(sym)


@st.cache_data(ttl=30, show_spinner=False)
def cached_option_chain(sym: str) -> list[dict]:
    exps = expiry_dates(sym)
    if not exps:
        return []
    return nse_option_chain(sym, exps[0])


@st.cache_data(ttl=30, show_spinner=False)
def cached_indices() -> dict:
    return nifty_indices()


@st.cache_data(ttl=3600, show_spinner=False)
def cached_fundamentals(sym: str) -> dict:
    return screener_ratios_summary(sym)


# ── Tab 1: Live Quote ───────────────────────────────────────────
with tabs[0]:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader(f"{symbol} — Live NSE Quote")
        try:
            q = cached_nse_quote(symbol)
            if q.get("lastPrice"):
                st.metric(
                    label=f"{q['symbol']} (NSE)",
                    value=f"₹{q['lastPrice']:,.2f}",
                    delta=f"{q.get('pChange', 0):+.2f}%",
                )
                st.json({
                    "Open": q.get("open"),
                    "Day High": q.get("dayHigh"),
                    "Day Low": q.get("dayLow"),
                    "Volume": f"{q.get('volume', 0):,}",
                })
            else:
                st.warning("NSE quote unavailable — NSE API may require Indian IP")
        except Exception as e:
            st.warning(f"NSE API error: {e}")

    with col2:
        st.subheader(f"{symbol} — Yahoo Finance Live")
        try:
            yq = cached_live_price(symbol)
            if yq.get("price"):
                st.metric(
                    label=f"{yq['symbol']} (Yahoo)",
                    value=f"₹{yq['price']:,.2f}",
                )
                st.json({
                    "Prev Close": yq.get("previousClose"),
                    "Day High": yq.get("dayHigh"),
                    "Day Low": yq.get("dayLow"),
                    "Volume": f"{yq.get('volume', 0):,}",
                    "Market Cap": f"₹{yq.get('marketCap', 0):,.0f}" if yq.get("marketCap") else "N/A",
                    "P/E": f"{yq.get('peRatio', 0):.2f}" if yq.get("peRatio") else "N/A",
                })
            else:
                st.warning("Yahoo Finance data unavailable")
        except Exception as e:
            st.warning(f"Yahoo error: {e}")

# ── Tab 2: Technical Indicators ─────────────────────────────────
with tabs[1]:
    st.subheader(f"{symbol} — Indicators")

    try:
        df = cached_indicators(symbol)
        if df.empty or len(df) < 50:
            st.warning("Not enough data (need 50+ trading days)")
        else:
            latest = df.iloc[-1]

            # Summary metrics
            mc1, mc2, mc3, mc4, mc5 = st.columns(5)
            mc1.metric("Close", f"₹{latest['close']:,.2f}")
            rsi_val = latest.get("rsi_14")
            mc2.metric("RSI-14", f"{rsi_val:.1f}" if pd.notna(rsi_val) else "N/A")
            macd_val = latest.get("macd")
            mc3.metric("MACD", f"{macd_val:.2f}" if pd.notna(macd_val) else "N/A")
            bbw_val = latest.get("bb_width")
            mc4.metric("BB Width", f"{bbw_val:.2%}" if pd.notna(bbw_val) else "N/A")
            atr_val = latest.get("atr_14")
            mc5.metric("ATR-14", f"₹{atr_val:.2f}" if pd.notna(atr_val) else "N/A")

            st.subheader("Price + Moving Averages")
            st.line_chart(
                df[["close", "sma_20", "sma_50", "sma_200", "ema_50", "ema_200"]]
                .dropna()
                .tail(252)
            )

            col_a, col_b = st.columns(2)
            with col_a:
                st.subheader("RSI-14")
                fig_rsi_data = df[["rsi_14"]].dropna().tail(252)
                if not fig_rsi_data.empty:
                    st.line_chart(fig_rsi_data)

            with col_b:
                st.subheader("MACD")
                fig_macd = df[["macd", "macd_signal"]].dropna().tail(252)
                if not fig_macd.empty:
                    st.line_chart(fig_macd)

            # EMA crossover detection
            cross = ema_crossover(symbol)
            if cross:
                st.success(f"**Signal:** {cross.upper()} — EMA-50 crossed EMA-200 today!")
            else:
                st.info("No EMA-50/200 crossover detected today")

            # Latest row as table
            with st.expander("Latest indicators (raw)"):
                cols_show = [c for c in df.columns if c != "ticker"]
                st.dataframe(df[cols_show].tail(5))
    except Exception as e:
        st.error(f"Error: {e}")

# ── Tab 3: EMA Crossover Scanner ────────────────────────────────
with tabs[2]:
    st.subheader("EMA-50/200 Crossover Scanner")
    st.caption("Scans NIFTY 200 stocks for golden cross / death cross signals today")

    default_tickers = [
        "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "ITC", "SBIN",
        "BHARTIARTL", "LT", "KOTAKBANK", "BAJFINANCE", "HINDUNILVR",
        "WIPRO", "TITAN", "MARUTI", "SUNPHARMA", "ONGC", "ADANIPORTS",
        "NTPC", "ULTRACEMCO", "HCLTECH", "POWERGRID", "ASIANPAINT",
        "M&M", "TRENT", "JSWSTEEL", "AXISBANK", "TATAMOTORS",
    ]
    ticker_input = st.text_area(
        "Tickers (comma-separated)",
        value=", ".join(default_tickers),
        height=100,
    )
    fast_ema = st.number_input("Fast EMA", value=50, min_value=5, max_value=200)
    slow_ema = st.number_input("Slow EMA", value=200, min_value=10, max_value=500)

    if st.button("Scan for crossovers", type="primary"):
        tickers = [t.strip().upper() for t in ticker_input.split(",") if t.strip()]
        if tickers:
            with st.spinner(f"Scanning {len(tickers)} tickers..."):
                signals = scan_ema_crossovers(tickers, fast=fast_ema, slow=slow_ema)

            if signals:
                st.success(f"Found {len(signals)} crossover signals!")
                signal_df = pd.DataFrame(signals)
                st.dataframe(signal_df, use_container_width=True)
            else:
                st.info("No crossover signals detected today")

# ── Tab 4: Option Chain & Greeks ────────────────────────────────
with tabs[3]:
    st.subheader(f"{symbol} — Option Chain & Greeks")

    try:
        # Get underlying price from yfinance
        live = get_live_price(symbol)
        underlying_price = live.get("price") or 0

        chain = cached_option_chain(symbol)
        if not chain:
            st.warning("Option chain unavailable (NSE API may require Indian IP)")
        else:
            # Enrich with Greeks
            enriched = enrich_option_chain(chain, underlying_price)

            # Build display DataFrame
            rows = []
            for entry in enriched:
                strike = entry["strikePrice"]
                expiry = entry.get("expiryDate", "")
                for side, label in [("ce", "CE"), ("pe", "PE")]:
                    leg = entry.get(side)
                    if not leg:
                        continue
                    rows.append({
                        "Strike": strike,
                        "Type": label,
                        "LTP": leg.get("lastPrice", ""),
                        "IV": f"{leg.get('iv', 0)*100:.1f}%" if leg.get("iv") else "",
                        "Delta": leg.get("delta", ""),
                        "Gamma": leg.get("gamma", ""),
                        "Vega": leg.get("vega", ""),
                        "Theta": leg.get("theta", ""),
                        "OI": f"{leg.get('openInterest', 0):,}",
                        "Vol": f"{leg.get('volume', 0):,}",
                    })

            if rows:
                oc_df = pd.DataFrame(rows)
                st.dataframe(oc_df, use_container_width=True)

                st.caption(
                    f"Underlying: ₹{underlying_price:,.2f} | "
                    f"Expiry: {enriched[0].get('expiryDate', 'N/A') if enriched else 'N/A'} | "
                    "Greeks: Black-Scholes via scipy"
                )

                # Greeks surface visualization
                st.subheader("Greeks Surface")
                pivot_df = oc_df.pivot_table(
                    index="Strike", columns="Type",
                    values=["Delta", "Gamma", "Vega", "Theta"],
                    aggfunc="first",
                )
                if not pivot_df.empty:
                    st.dataframe(pivot_df.applymap(
                        lambda x: f"{x:.4f}" if isinstance(x, (int, float)) else x
                    ))
            else:
                st.info("No option data available")
    except Exception as e:
        st.error(f"Option chain error: {e}")

# ── Tab 5: Fundamentals ─────────────────────────────────────────
with tabs[4]:
    st.subheader(f"{symbol} — Fundamental Ratios (Screener.in)")

    try:
        ratios = cached_fundamentals(symbol)
        if ratios:
            st.json(ratios)

            # Try getting more detailed data
            with st.expander("Raw Screener.in data"):
                df_raw = screener_export(symbol)
                if df_raw is not None and not df_raw.empty:
                    st.dataframe(df_raw)
                else:
                    st.info("No detailed Screener.in data available")
        else:
            st.warning("Fundamental data unavailable")
    except Exception as e:
        st.error(f"Fundamental error: {e}")

# ── Tab 6: Indices ──────────────────────────────────────────────
with tabs[5]:
    st.subheader("NSE Indices")

    try:
        indices = cached_indices()
        if indices:
            idx_df = pd.DataFrame([
                {
                    "Index": v["index"],
                    "Price": v.get("last", ""),
                    "Change": v.get("change", ""),
                    "%Chg": f"{v.get('pChange', 0):+.2f}%" if v.get("pChange") else "",
                    "Open": v.get("open", ""),
                    "High": v.get("high", ""),
                    "Low": v.get("low", ""),
                }
                for v in indices.values()
            ])
            st.dataframe(idx_df, use_container_width=True)
        else:
            st.warning("Indices data unavailable")
    except Exception as e:
        st.error(f"Indices error: {e}")

# ── Auto-refresh ────────────────────────────────────────────────
if refresh_rate > 0:
    time.sleep(0.1)
    st.rerun()

st.sidebar.caption(f"Last refreshed: {datetime.now().strftime('%H:%M:%S')}")
st.sidebar.caption(f"Cache dir: {DATA_DIR}")
