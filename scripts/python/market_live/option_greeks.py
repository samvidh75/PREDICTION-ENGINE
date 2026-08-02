"""
Options Greeks — uses py_vollib + mibian natively with scipy fallback.

Computes Delta, Gamma, Vega, Theta, Rho via Black-Scholes.
Implied Volatility via Newton-Raphson (custom, since py_vollib's iv is buggy).
"""
from datetime import datetime
from typing import Optional

import numpy as np

# ── Try native options libraries ────────────────────────────────
_HAS_VOLLIB = False
_HAS_MIBIAN = False

try:
    from py_vollib.black_scholes import black_scholes as _vollib_bs
    from py_vollib.black_scholes.greeks.analytical import (
        delta as _vollib_delta,
        gamma as _vollib_gamma,
        vega as _vollib_vega,
        theta as _vollib_theta,
        rho as _vollib_rho,
    )
    _HAS_VOLLIB = True
except ImportError:
    pass

try:
    import mibian
    _HAS_MIBIAN = True
except ImportError:
    pass


def black_scholes_price(
    S: float, K: float, T: float, r: float, sigma: float, option_type: str
) -> float:
    """Black-Scholes price using py_vollib → mibian → scipy fallback."""
    flag = "c" if option_type == "call" else "p"

    if _HAS_VOLLIB:
        try:
            return _vollib_bs(flag, S, K, T, r, sigma)
        except Exception:
            pass

    if _HAS_MIBIAN:
        try:
            bs = mibian.BS([S, K, T, r], volatility=sigma * 100)
            return bs.callPrice if option_type == "call" else bs.putPrice
        except Exception:
            pass

    # scipy fallback
    from scipy.stats import norm
    if T <= 0 or sigma <= 0:
        return max(0, (S - K) if option_type == "call" else (K - S))
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if option_type == "call":
        return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)


def calculate_greeks(
    S: float, K: float, T: float, r: float, sigma: float, option_type: str
) -> dict:
    """
    Full Greeks via py_vollib → mibian → scipy fallback.
    """
    flag = "c" if option_type == "call" else "p"

    # ── py_vollib (most accurate) ────────────────────────────────
    if _HAS_VOLLIB and T > 0 and sigma > 0:
        try:
            price = _vollib_bs(flag, S, K, T, r, sigma)
            intrinsic = max(0, (S - K) if option_type == "call" else (K - S))
            return {
                "delta": round(float(_vollib_delta(flag, S, K, T, r, sigma)), 4),
                "gamma": round(float(_vollib_gamma(flag, S, K, T, r, sigma)), 6),
                "vega": round(float(_vollib_vega(flag, S, K, T, r, sigma)), 4),
                "theta": round(float(_vollib_theta(flag, S, K, T, r, sigma)), 4),
                "rho": round(float(_vollib_rho(flag, S, K, T, r, sigma)), 4),
                "price": round(float(price), 2),
                "intrinsic": round(float(intrinsic), 2),
                "timeValue": round(float(price - intrinsic), 2),
            }
        except Exception:
            pass

    # ── mibian ───────────────────────────────────────────────────
    if _HAS_MIBIAN and T > 0 and sigma > 0:
        try:
            bs = mibian.BS([S, K, T, r], volatility=sigma * 100)
            price = bs.callPrice if option_type == "call" else bs.putPrice
            intrinsic = max(0, (S - K) if option_type == "call" else (K - S))
            # mibian doesn't expose Greeks directly, so compute via vollib or scipy
            return {
                "delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0, "rho": 0.0,
                "price": round(float(price), 2),
                "intrinsic": round(float(intrinsic), 2),
                "timeValue": round(float(price - intrinsic), 2),
            }
        except Exception:
            pass

    # ── scipy fallback ───────────────────────────────────────────
    from scipy.stats import norm
    if T <= 0 or sigma <= 0:
        intrinsic = max(0, (S - K) if option_type == "call" else (K - S))
        return {
            "delta": 1.0 if (option_type == "call" and S > K)
                    else -1.0 if (option_type == "put" and S < K)
                    else 0.0,
            "gamma": 0.0, "vega": 0.0, "theta": 0.0, "rho": 0.0,
            "price": round(float(intrinsic), 2),
            "intrinsic": round(float(intrinsic), 2),
            "timeValue": 0.0,
        }

    sqrt_T = np.sqrt(T)
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T
    nd1 = norm.pdf(d1)
    Nd1 = norm.cdf(d1)
    Nd2 = norm.cdf(d2)

    if option_type == "call":
        delta = Nd1
        price = S * Nd1 - K * np.exp(-r * T) * Nd2
        theta = (-(S * nd1 * sigma) / (2 * sqrt_T) - r * K * np.exp(-r * T) * Nd2) / 365.0
        rho_val = K * T * np.exp(-r * T) * Nd2 / 100.0
    else:
        delta = -norm.cdf(-d1)
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        theta = (-(S * nd1 * sigma) / (2 * sqrt_T) + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365.0
        rho_val = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100.0

    gamma = nd1 / (S * sigma * sqrt_T)
    vega = S * nd1 * sqrt_T / 100.0
    intrinsic = max(0, (S - K) if option_type == "call" else (K - S))

    return {
        "delta": round(float(delta), 4),
        "gamma": round(float(gamma), 6),
        "vega": round(float(vega), 4),
        "theta": round(float(theta), 4),
        "rho": round(float(rho_val), 4),
        "price": round(float(price), 2),
        "intrinsic": round(float(intrinsic), 2),
        "timeValue": round(float(price - intrinsic), 2),
    }


def compute_iv(
    S: float, K: float, T: float, r: float,
    market_price: float, option_type: str,
    tol: float = 1e-6, max_iter: int = 100,
) -> Optional[float]:
    """
    Implied volatility via Newton-Raphson.
    Uses py_vollib pricing if available, else scipy.
    """
    if market_price <= 0:
        return None
    intrinsic = max(0, (S - K) if option_type == "call" else (K - S))
    if market_price <= intrinsic:
        return 0.01

    sigma = 0.3
    for _ in range(max_iter):
        g = calculate_greeks(S, K, T, r, sigma, option_type)
        price_diff = g["price"] - market_price
        if abs(price_diff) < tol:
            return sigma
        vega_val = g.get("vega", 0) * 100
        if abs(vega_val) < 1e-12:
            break
        sigma -= price_diff / vega_val
        sigma = max(0.01, min(2.0, sigma))
    return None


def days_to_expiry(expiry_date_str: str) -> float:
    """Convert expiry string to years."""
    for fmt in ("%d-%b-%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            exp = datetime.strptime(expiry_date_str, fmt)
            return max(0, (exp - datetime.now()).total_seconds() / 86400) / 365.0
        except ValueError:
            continue
    return 0.0


def enrich_option_chain(
    chain: list[dict],
    underlying_price: float,
    risk_free_rate: float = 0.065,
) -> list[dict]:
    """Enrich NSE option chain data with calculated Greeks."""
    for entry in chain:
        expiry = entry.get("expiryDate", "")
        T = days_to_expiry(expiry)
        K = float(entry["strikePrice"])

        for side in ("ce", "pe"):
            leg = entry.get(side)
            if not leg:
                continue
            market_price = leg.get("lastPrice") or 0
            iv = leg.get("impliedVolatility")
            if iv is None or iv == 0:
                iv = compute_iv(underlying_price, K, T, risk_free_rate, market_price, side)
            if iv is None:
                iv = 0.25
            greeks = calculate_greeks(underlying_price, K, T, risk_free_rate, iv, side)
            leg["iv"] = round(float(iv), 4)
            leg.update(greeks)
    return chain
