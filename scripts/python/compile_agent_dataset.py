import json
OUTPUT_FILE = "cloud_agent_dataset.jsonl"
def compile_agentic_tuning_data():
    """
    Generates structured agent tool-calling datasets to fine-tune Qwen 
    into a native financial code interpreter and calculation engine.
    """
    # Define the mathematical tools schema available to our StockEX Python runtime
    tools_schema = [
        {
            "type": "function",
            "function": {
                "name": "calculate_technical_indicators",
                "description": "Calculates advanced moving averages (SMA), Bollinger Bands, and MACD for an Indian equity using pandas and numpy.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string", "description": "The stock ticker symbol, e.g., TCS, RELIANCE"},
                        "indicator_type": {"type": "string", "enum": ["SMA_50", "SMA_200", "BOLLINGER_BANDS", "MACD"]}
                    },
                    "required": ["ticker", "indicator_type"]
                }
            }
        }
    ]

    # Build the multi-turn agentic conversational samples
    agent_turns = [
        {
            "messages": [
                {
                    "role": "system",
                    "content": f"You are the StockEX Agentic Core. If a query requires mathematical verification or technical indicators, you must invoke the appropriate tool signature from this array: {json.dumps(tools_schema)}. Never hallucinate values."
                },
                {
                    "role": "user",
                    "content": "Is TCS currently trading above its 50-day moving average? Check the technicals."
                },
                {
                    "role": "assistant",
                    "tool_calls": [
                        {
                            "id": "call_tcs_sma50_001",
                            "type": "function",
                            "function": {
                                "name": "calculate_technical_indicators",
                                "arguments": json.dumps({"ticker": "TCS", "indicator_type": "SMA_50"})
                            }
                        }
                    ]
                },
                {
                    "role": "tool",
                    "tool_call_id": "call_tcs_sma50_001",
                    "name": "calculate_technical_indicators",
                    "content": json.dumps({"ticker": "TCS", "current_price": 4120.50, "sma_50": 3950.20, "status": "ABOVE_SMA_50"})
                },
                {
                    "role": "assistant",
                    "content": "Mathematical execution via our local Python libraries confirms that TCS is currently trading at ₹4,120.50, which is safely above its 50-day Simple Moving Average (SMA) of ₹3,950.20. This indicates a strong short-term bullish continuation pattern."
                }
            ]
        }
    ]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for turn in agent_turns:
            f.write(json.dumps(turn) + "\n")
            
    print(f"🎉 Agentic training dataset successfully compiled and written to: {OUTPUT_FILE}")
if __name__ == "__main__":
    agent_turns = compile_agentic_tuning_data()