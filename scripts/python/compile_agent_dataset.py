import json
import random
import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "cloud_agent_dataset.jsonl")
OUTPUT_FILE = os.path.abspath(OUTPUT_FILE)

random.seed(42)

FUNCTION_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "calculate_indian_market_metrics",
            "description": "Calculates true technical moving averages (SMA/EMA), Bollinger Bands, MACD, and pulls audited fundamental ratios (P/E, D/E, Market Cap Cr) from the database partitions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "The stock ticker symbol, e.g., SBIN, TCS"},
                    "metric_type": {
                        "type": "string",
                        "enum": ["TECHNICAL_MOMENTUM", "VALUATION_RATIOS", "GOVERNANCE_CHECK"]
                    }
                },
                "required": ["ticker", "metric_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_batch_market_metrics",
            "description": "Batch-calculates technical and fundamental metrics for multiple Indian stocks in a single call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tickers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Array of stock ticker symbols, e.g. [SBIN, TCS, RELIANCE]"
                    },
                    "metric_types": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["TECHNICAL_MOMENTUM", "VALUATION_RATIOS", "GOVERNANCE_CHECK"]
                        }
                    }
                },
                "required": ["tickers", "metric_types"]
            }
        }
    }
]

NSE_TICKERS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK",
    "BAJFINANCE", "LT", "WIPRO", "AXISBANK", "TITAN",
    "ASIANPAINT", "MARUTI", "SUNPHARMA", "NTPC", "ONGC",
    "POWERGRID", "ULTRACEMCO", "BAJAJFINSV", "ADANIPORTS", "NESTLEIND",
    "JSWSTEEL", "TECHM", "HCLTECH", "GRASIM", "INDUSINDBK",
    "TATAMOTORS", "BRITANNIA", "DRREDDY", "CIPLA", "DIVISLAB",
    "COALINDIA", "SBILIFE", "EICHERMOT", "BPCL", "HDFCLIFE",
    "TATASTEEL", "HEROMOTOCO", "ADANIENT", "BAJAJ_AUTO", "IOC",
    "M&M", "TRENT", "HINDALCO", "BEL", "VEDL",
    "SIEMENS", "DLF", "HAVELLS", "ICICIPRULI", "PIDILITIND",
    "TATACONSUM", "GODREJCP", "TCS", "MARICO", "DABUR",
    "SRTRANSFIN", "HDFCAMC", "COLPAL", "TVSMOTOR", "MUTHOOTFIN",
    "BANKBARODA", "LICI", "PNB", "IDBI", "CANBK",
    "NHPC", "IRFC", "RVNL", "HAL", "BHEL"
]

SME_TICKERS = ["MAHICKRA", "SHAREINDIA", "GANGESSEC", "JAYBARMARU", "ONEPOINT"]
BSE_TICKERS = [t + "-BO" for t in NSE_TICKERS[:10]]

ALL_TICKERS = NSE_TICKERS + SME_TICKERS + BSE_TICKERS

METRIC_TYPES = ["TECHNICAL_MOMENTUM", "VALUATION_RATIOS", "GOVERNANCE_CHECK"]

SYSTEM_PROMPT_TEMPLATE = (
    "You are CodeEX, the StockEX agentic core for Indian equity markets (NSE, BSE, SME). "
    "Your role is to answer user queries about Indian stocks using deterministic tool calls. "
    "If a query requires mathematical verification, technical indicators, fundamental ratios, "
    "or governance checks, you MUST invoke the appropriate tool signature from this array: "
    "{schemas} "
    "Never hallucinate values. Always call the tool, receive computed results, "
    "and synthesise a precise answer from the math engine output."
)

TOPICS = [
    "What is the current technical momentum for {ticker}?",
    "Check the valuation ratios for {ticker}.",
    "Run a governance check on {ticker}.",
    "Is {ticker} overbought or oversold based on technical data?",
    "Analyse the P/E and D/E ratios for {ticker}.",
    "Perform a full health check on {ticker} including all metrics.",
    "Compare the technical momentum across {ticker} and its sector peers.",
    "What are the Bollinger Band readings for {ticker}?",
    "Show me the MACD crossover signal for {ticker}.",
    "Calculate the moving averages for {ticker}.",
    "Evaluate the debt-to-equity ratio of {ticker}.",
    "Is {ticker} showing bullish momentum on the daily chart?",
    "What is the market capitalisation and PE ratio of {ticker}?",
    "Run a comprehensive fundamental analysis on {ticker}.",
    "Check for any governance red flags on {ticker}.",
    "What does the technical data say about {ticker} trend alignment?",
    "Analyse both technical and fundamental metrics for {ticker}.",
    "Give me a quick snapshot of {ticker} health metrics.",
    "Generate the ROCE and ROE trends for {ticker}.",
    "Is there any divergence in the price action of {ticker}?",
]

MOCK_METRICS_POOL = {
    "TECHNICAL_MOMENTUM": {
        "sma_50": lambda: round(random.uniform(100, 5000), 2),
        "sma_200": lambda: round(random.uniform(95, 4900), 2),
        "ema_12": lambda: round(random.uniform(102, 5100), 2),
        "ema_26": lambda: round(random.uniform(98, 5000), 2),
        "macd_line": lambda: round(random.uniform(-50, 80), 4),
        "macd_signal": lambda: round(random.uniform(-45, 75), 4),
        "bollinger_upper": lambda: round(random.uniform(105, 5200), 2),
        "bollinger_lower": lambda: round(random.uniform(95, 4800), 2),
        "bollinger_middle": lambda: round(random.uniform(100, 5000), 2),
        "rsi_14": lambda: round(random.uniform(20, 80), 1),
        "trend_alignment": lambda: random.choice(["BULLISH", "BEARISH", "NEUTRAL", "STRONG_BULLISH", "WEAK_BULLISH"]),
        "momentum_score": lambda: round(random.uniform(10, 99), 0),
        "current_price": lambda: round(random.uniform(100, 5200), 2),
    },
    "VALUATION_RATIOS": {
        "pe_ratio": lambda: round(random.uniform(8, 80), 2),
        "industry_pe": lambda: round(random.uniform(10, 70), 2),
        "pb_ratio": lambda: round(random.uniform(1, 15), 2),
        "debt_to_equity": lambda: round(random.uniform(0, 3.5), 2),
        "market_cap_cr": lambda: round(random.uniform(500, 1800000), 2),
        "dividend_yield": lambda: round(random.uniform(0, 6), 2),
        "roce": lambda: round(random.uniform(5, 35), 1),
        "roe": lambda: round(random.uniform(6, 40), 1),
        "revenue_growth_yoy": lambda: round(random.uniform(-10, 45), 1),
        "profit_growth_yoy": lambda: round(random.uniform(-15, 50), 1),
        "valuation_signal": lambda: random.choice(["FAIR", "OVERVALUED", "UNDERVALUED", "SLIGHTLY_OVERVALUED"]),
    },
    "GOVERNANCE_CHECK": {
        "promoter_holding": lambda: round(random.uniform(40, 85), 2),
        "fii_holding": lambda: round(random.uniform(5, 40), 2),
        "dii_holding": lambda: round(random.uniform(5, 35), 2),
        "pledge_percentage": lambda: round(random.uniform(0, 15), 2),
        "audit_flag": lambda: random.choice(["CLEAN", "CLEAN", "CLEAN", "NOTE_IN_FINANCIALS", "CLEAN"]),
        "board_independence": lambda: random.choice(["ADEQUATE", "STRONG", "ADEQUATE", "NEEDS_REVIEW"]),
        "governance_score": lambda: round(random.uniform(60, 100), 0),
        "related_party_transactions_cr": lambda: round(random.uniform(10, 500), 2),
        "governance_rating": lambda: random.choice(["EXCELLENT", "GOOD", "SATISFACTORY", "EXCELLENT", "GOOD"]),
    }
}


def build_tool_result(ticker: str, metric_type: str) -> dict:
    metrics = MOCK_METRICS_POOL[metric_type]
    result = {"ticker": ticker, "metric_type": metric_type}
    for k, fn in metrics.items():
        result[k] = fn()
    return result


def build_synthetic_answers(ticker: str, metric_type: str, tool_result: dict) -> str:
    if metric_type == "TECHNICAL_MOMENTUM":
        signal = tool_result["trend_alignment"]
        rsi = tool_result["rsi_14"]
        price = tool_result["current_price"]
        macd = tool_result["macd_line"]
        return (
            f"Mathematical execution via CodeEX Python runtime confirms that {ticker} is currently trading at Rs{price:.2f}. "
            f"Technical indicators show {signal} alignment (RSI: {rsi:.1f}, MACD: {macd:.4f}). "
            f"The 50-day SMA of Rs{tool_result['sma_50']:.2f} and 200-day SMA of Rs{tool_result['sma_200']:.2f} indicate "
            f"{'strong short-term bullish continuation' if price > tool_result['sma_50'] else 'short-term bearish pressure'}. "
            f"Momentum score: {tool_result['momentum_score']:.0f}/99."
        )
    elif metric_type == "VALUATION_RATIOS":
        return (
            f"CodeEX fundamental analysis for {ticker}: P/E ratio of {tool_result['pe_ratio']:.2f} "
            f"(industry: {tool_result['industry_pe']:.2f}), P/B of {tool_result['pb_ratio']:.2f}, "
            f"D/E ratio of {tool_result['debt_to_equity']:.2f}, and market cap of Rs{tool_result['market_cap_cr']:.2f} Cr. "
            f"ROE stands at {tool_result['roe']:.1f}% with revenue growth of {tool_result['revenue_growth_yoy']:.1f}% YoY. "
            f"Overall valuation signal: {tool_result['valuation_signal']}."
        )
    else:
        return (
            f"CodeEX governance check for {ticker}: Promoter holding at {tool_result['promoter_holding']:.2f}%, "
            f"FIIs at {tool_result['fii_holding']:.2f}%, DIIs at {tool_result['dii_holding']:.2f}%. "
            f"Pledge {tool_result['pledge_percentage']:.2f}% — audit status: {tool_result['audit_flag']}. "
            f"Board independence is {tool_result['board_independence']}. "
            f"Governance score: {tool_result['governance_score']:.0f}/100 ({tool_result['governance_rating']})."
        )


def build_synthetic_user_question(ticker: str, metric_type: str) -> str:
    topic = random.choice(TOPICS).format(ticker=ticker)
    if metric_type == "VALUATION_RATIOS":
        topic = f"What are the valuation metrics for {ticker}?"
    elif metric_type == "GOVERNANCE_CHECK":
        topic = f"Check the corporate governance status for {ticker}."
    return topic


def generate_agentic_turn(ticker: str, metric_type: str, turn_id: int) -> dict:
    tool_result = build_tool_result(ticker, metric_type)
    tool_call_id = f"call_{ticker}_{metric_type}_{turn_id}"

    return {
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT_TEMPLATE.format(
                    schemas=json.dumps(FUNCTION_SCHEMAS)
                )
            },
            {
                "role": "user",
                "content": build_synthetic_user_question(ticker, metric_type)
            },
            {
                "role": "assistant",
                "tool_calls": [
                    {
                        "id": tool_call_id,
                        "type": "function",
                        "function": {
                            "name": "calculate_indian_market_metrics",
                            "arguments": json.dumps({"ticker": ticker, "metric_type": metric_type})
                        }
                    }
                ]
            },
            {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "name": "calculate_indian_market_metrics",
                "content": json.dumps(tool_result)
            },
            {
                "role": "assistant",
                "content": build_synthetic_answers(ticker, metric_type, tool_result)
            }
        ]
    }


def generate_batch_turn(tickers: list, metric_types: list, turn_id: int) -> dict:
    results = {}
    for mt in metric_types:
        results[mt] = {}
        for t in tickers:
            results[mt][t] = build_tool_result(t, mt)

    tool_call_id = f"call_batch_{turn_id}"

    return {
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT_TEMPLATE.format(
                    schemas=json.dumps(FUNCTION_SCHEMAS)
                )
            },
            {
                "role": "user",
                "content": f"Run a comparative analysis on {', '.join(tickers)} across all available metrics."
            },
            {
                "role": "assistant",
                "tool_calls": [
                    {
                        "id": tool_call_id,
                        "type": "function",
                        "function": {
                            "name": "calculate_batch_market_metrics",
                            "arguments": json.dumps({"tickers": tickers, "metric_types": metric_types})
                        }
                    }
                ]
            },
            {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "name": "calculate_batch_market_metrics",
                "content": json.dumps(results)
            },
            {
                "role": "assistant",
                "content": f"Batch analysis complete for {', '.join(tickers)}. "
                           f"Processed {len(metric_types)} metric categories across {len(tickers)} securities. "
                           f"Results computed via CodeEX Python runtime with zero hallucination."
            }
        ]
    }


def main():
    all_turns = []

    turn_id = 0
    VARIATIONS_PER_PAIR = 18
    for ticker in ALL_TICKERS:
        for metric_type in METRIC_TYPES:
            for _ in range(VARIATIONS_PER_PAIR):
                all_turns.append(generate_agentic_turn(ticker, metric_type, turn_id))
                turn_id += 1

    for _ in range(150):
        batch_tickers = random.sample(ALL_TICKERS, min(random.randint(2, 4), len(ALL_TICKERS)))
        batch_metrics = random.sample(METRIC_TYPES, random.randint(1, len(METRIC_TYPES)))
        all_turns.append(generate_batch_turn(batch_tickers, batch_metrics, turn_id))
        turn_id += 1

    random.shuffle(all_turns)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for turn in all_turns:
            f.write(json.dumps(turn) + "\n")

    print(f"CodeEX dataset written to: {OUTPUT_FILE}")
    print(f"Total training pairs: {len(all_turns)}")

if __name__ == "__main__":
    main()
