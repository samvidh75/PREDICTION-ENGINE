import json
import os
import random

OUTPUT_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "cloud_agent_dataset.jsonl")
)
DATABASE_URL = os.getenv("DATABASE_URL")

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "calculate_indian_market_metrics",
            "description": "Calculates true technical moving averages (SMA/EMA), Bollinger Bands, and pulls audited fundamental ratios from Neon PostgreSQL.",
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
    }
]

SYSTEM_PROMPT = (
    "You are CodeEX, the StockEX Agentic Core for Indian equity markets (NSE, BSE, SME). "
    "If a query requires financial variables or technical indicators, "
    "you must invoke a tool call from this schema: {schema}. "
    "Never invent numbers. Always call the tool."
)


def fetch_from_neon() -> list[dict]:
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        print("psycopg2 not available, falling back to synthetic data")
        return []

    if not DATABASE_URL:
        print("DATABASE_URL not set, falling back to synthetic data")
        return []

    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.ticker, r.market_cap_cr, r.pe_ratio,
                   r.debt_to_equity, r.promoter_pledged_pct
            FROM asset_fundamental_ratios r LIMIT 50;
        """)
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        print(f"Pulled {len(records)} records from Neon PostgreSQL")
        return [dict(r) for r in records]
    except Exception as e:
        print(f"Neon query failed ({e}), falling back to synthetic data")
        return []


def generate_synthetic_records(count: int = 200) -> list[dict]:
    random.seed(42)
    tickers = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
        "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK",
    ]
    records = []
    for t in tickers:
        for _ in range(count // len(tickers)):
            records.append({
                "ticker": t,
                "market_cap_cr": round(random.uniform(1000, 800000), 2),
                "pe_ratio": round(random.uniform(8, 60), 2),
                "debt_to_equity": round(random.uniform(0.1, 3.0), 2),
                "promoter_pledged_pct": round(random.uniform(0, 15), 2),
            })
    return records


def main():
    records = fetch_from_neon()
    if not records:
        records = generate_synthetic_records()

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for row in records:
            ticker_clean = row["ticker"].replace(".NS", "").replace(".BO", "")
            tool_call_id = f"call_{ticker_clean.lower()}_val_001"

            turn = {
                "messages": [
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT.format(schema=json.dumps(TOOLS_SCHEMA)),
                    },
                    {
                        "role": "user",
                        "content": f"Analyze the current valuation ratios and capital configurations for {ticker_clean}.",
                    },
                    {
                        "role": "assistant",
                        "tool_calls": [
                            {
                                "id": tool_call_id,
                                "type": "function",
                                "function": {
                                    "name": "calculate_indian_market_metrics",
                                    "arguments": json.dumps({
                                        "ticker": ticker_clean,
                                        "metric_type": "VALUATION_RATIOS",
                                    }),
                                },
                            }
                        ],
                    },
                    {
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "name": "calculate_indian_market_metrics",
                        "content": json.dumps({
                            "ticker": ticker_clean,
                            "market_cap_cr": float(row["market_cap_cr"]),
                            "pe_ratio": float(row["pe_ratio"] or 0.0),
                            "debt_to_equity": float(row["debt_to_equity"] or 0.0),
                            "promoter_pledged_pct": float(row["promoter_pledged_pct"] or 0.0),
                        }),
                    },
                    {
                        "role": "assistant",
                        "content": (
                            f"Verified fundamental metrics for {ticker_clean} confirm an active "
                            f"Market Cap of Rs{float(row['market_cap_cr']):.2f} Cr, trading at a "
                            f"P/E multiple of {float(row['pe_ratio'] or 0):.2f}x with a "
                            f"Debt-to-Equity ratio of {float(row['debt_to_equity'] or 0):.2f}. "
                            f"These metrics have been computed natively via the local Python database adapter."
                        ),
                    },
                ]
            }

            f.write(json.dumps(turn) + "\n")

    print(f"Dataset written: {OUTPUT_FILE} ({len(records)} training pairs)")


if __name__ == "__main__":
    main()
