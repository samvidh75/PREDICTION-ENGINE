"""
StockStory Model Evaluation — 12-Stock Benchmark
=================================================
Tests a fine-tuned model against a standardized set of 12 Indian stocks
across fundamental, technical, earnings, and regulatory categories.

Usage:
    python evaluate_model.py [--model-path path] [--quantized]
"""

import argparse
import json
import sys
import time
from pathlib import Path

BENCHMARK_STOCKS = [
    # (ticker, instruction, input, expected_healthometer_range, category)
    # Fundamental
    ("RELIANCE", "Evaluate corporate governance and fundamental sustainability for an Indian equity.",
     "Ticker: RELIANCE | Sector: Energy/Telco/Retail | P/E: 32.4 | Debt/Equity: 0.8 | Promoter Pledging: 0% | ROCE: 16.2% | Revenue Growth: 12% | Auditor Commentary: Standard audit opinion. All entities consolidated.",
     (60, 75), "fundamental"),
    ("ADANIENT", "Evaluate corporate governance and fundamental sustainability for an Indian equity.",
     "Ticker: ADANIENT | Sector: Diversified | P/E: 45.2 | Debt/Equity: 1.8 | Promoter Pledging: 52.4% | ROCE: 8.5% | Revenue Growth: 22% | Auditor Commentary: Auditor noted multi-layered shell entities handling capital distribution streams.",
     (20, 40), "fundamental"),
    ("INFY", "Evaluate corporate governance and fundamental sustainability for an Indian equity.",
     "Ticker: INFY | Sector: IT | P/E: 22.1 | Debt/Equity: 0.1 | Promoter Pledging: 0% | ROCE: 32.4% | Revenue Growth: 5% | Auditor Commentary: Auditor notes no material discrepancies. Revenue recognition policy consistent.",
     (75, 90), "fundamental"),
    ("TCS", "Evaluate corporate governance and fundamental sustainability for an Indian equity.",
     "Ticker: TCS | Sector: IT | P/E: 26.3 | Debt/Equity: 0.05 | Promoter Pledging: 0% | ROCE: 48.2% | Revenue Growth: 8% | Auditor Commentary: Clean audit with robust internal financial controls.",
     (80, 90), "fundamental"),
    ("PAYTM", "Evaluate corporate governance and fundamental sustainability for an Indian equity.",
     "Ticker: PAYTM | Sector: Fintech | P/E: 0 | Debt/Equity: 0.2 | Promoter Pledging: 0% | ROCE: -5.2% | Revenue Growth: -15% | Auditor Commentary: Auditor highlights going concern uncertainty due to regulatory restrictions on payments bank.",
     (20, 40), "fundamental"),
    # Technical
    ("RELIANCE", "Analyze technical price structures and institutional order flow anomalies on the NSE.",
     "Ticker: RELIANCE | Sector: Energy | Last Price: 2490 | Volume Expansion: 2.6x | Delivery %: 72% | Order Flow: Institutional block deal detected via NSE co-location server window tracking.",
     (70, 90), "technical"),
    ("ADANIPORTS", "Analyze technical price structures and institutional order flow anomalies on the NSE.",
     "Ticker: ADANIPORTS | Sector: Infrastructure | Last Price: 1150 | Volume Expansion: 1.4x | Delivery %: 32% | Order Flow: Continued delivery selling. DIIs reducing stake.",
     (30, 50), "technical"),
    ("DMART", "Analyze technical price structures and institutional order flow anomalies on the NSE.",
     "Ticker: DMART | Sector: Retail | Last Price: 4800 | Volume Expansion: 1.0x | Delivery %: 38% | Order Flow: Insider selling by promoter entity via bulk deal window.",
     (30, 50), "technical"),
    ("ZOMATO", "Analyze technical price structures and institutional order flow anomalies on the NSE.",
     "Ticker: ZOMATO | Sector: Internet | Last Price: 268 | Volume Expansion: 1.8x | Delivery %: 76% | Order Flow: Mutual funds increased allocation. Delivery percentage elevated.",
     (65, 85), "technical"),
    # Earnings
    ("TATAMOTORS", "Analyze quarterly earnings performance and management commentary for an Indian equity.",
     "Ticker: TATAMOTORS | Sector: Auto | Result: Beat | Revenue Growth: 18.5% | Margin Change: 250bps | Guidance: Raised | Management Commentary: JLR margins at 9-year high. EV volumes accelerating.",
     (80, 95), "earnings"),
    ("WIPRO", "Analyze quarterly earnings performance and management commentary for an Indian equity.",
     "Ticker: WIPRO | Sector: IT | Result: Miss | Revenue Growth: 2.1% | Margin Change: -80bps | Guidance: Cut | Management Commentary: Client discretionary spending remains weak. Consulting revenue down.",
     (25, 45), "earnings"),
    # Regulatory
    ("Midcap Derivatives", "Assess the structural impact of a SEBI regulatory circular on market mechanics.",
     "Sector: Midcap Derivatives | SEBI Action: SEBI increases minimum contract value to 15 Lakhs and restricts weekly expiries to 1 per exchange. | Impacted Assets: Volatility Index, Nifty Midcap Select, BSE Midcap",
     (20, 45), "regulatory"),
]


def extract_healthometer(text):
    import re
    match = re.search(r'Healthometer[:\s]*(\d+)/100', text)
    if match:
        return int(match.group(1))
    return None


def extract_risk(text):
    import re
    match = re.search(r'Risk[:\s]*(\w+)', text)
    if match:
        return match.group(1)
    return None


def evaluate_model_local(model_path, quantized=False):
    print(f"{'='*70}")
    print(f"  STOCKSTORY MODEL EVALUATION \u2014 12-Stock Benchmark")
    print(f"{'='*70}")
    print(f"  Model: {model_path}")
    print(f"  Quantized: {quantized}")
    print(f"{'='*70}\n")

    try:
        from llama_cpp import Llama
        print("  Loading model with llama-cpp-python...")
        llm = Llama(model_path=model_path, n_ctx=2048, n_threads=4, verbose=False)
        print(f"  \u2713 Model loaded\n")
    except ImportError:
        print("  ERROR: llama-cpp-python not installed. Install with:")
        print("  pip install llama-cpp-python")
        sys.exit(1)
    except Exception as e:
        print(f"  ERROR loading model: {e}")
        sys.exit(1)

    results = []
    total_time = 0
    correct_healthometer = 0
    correct_risk = 0

    for i, (ticker, instruction, input_text, expected_range, category) in enumerate(BENCHMARK_STOCKS, 1):
        prompt = f"""<|im_start|>system
You are a dedicated Indian stock market chip running on this phone. Use the context to summarize or answer the query directly in under 2 short sentences.
<|im_start|>user
Task: {instruction}
Context: {input_text}
<|im_start|>assistant"""

        start = time.time()
        output = llm(prompt, max_tokens=128, temperature=0.3, stop=["<|im_end|>", "<|im_start|>"])
        elapsed = time.time() - start
        total_time += elapsed

        response_text = output["choices"][0]["text"].strip() if output.get("choices") else ""
        healthometer = extract_healthometer(response_text)
        risk = extract_risk(response_text)

        ho_correct = False
        risk_correct = False
        if healthometer is not None:
            lo, hi = expected_range
            ho_correct = lo <= healthometer <= hi
            if ho_correct:
                correct_healthometer += 1
            risk_correct = True

        results.append({
            "ticker": ticker, "category": category, "expected_range": expected_range,
            "healthometer": healthometer, "risk": risk, "ho_correct": ho_correct,
            "response": response_text[:150], "time": round(elapsed, 2),
        })

        status = "\u2705" if ho_correct else "\u274c"
        print(f"  {status} [{i}/{len(BENCHMARK_STOCKS)}] {ticker:<14} "
              f"HO={healthometer} (expected {expected_range[0]}-{expected_range[1]}) "
              f"Risk={risk or 'N/A'} [{elapsed:.1f}s]")

    print()
    print(f"{'='*70}")
    print(f"  RESULTS SUMMARY")
    print(f"{'='*70}")
    print(f"  Healthometer Accuracy:  {correct_healthometer}/{len(BENCHMARK_STOCKS)} "
          f"({correct_healthometer/len(BENCHMARK_STOCKS)*100:.0f}%)")
    print(f"  Total Time:            {total_time:.1f}s "
          f"({total_time/len(BENCHMARK_STOCKS):.1f}s avg per query)")
    print()

    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {"correct": 0, "total": 0}
        categories[cat]["total"] += 1
        if r["ho_correct"]:
            categories[cat]["correct"] += 1

    print(f"  Per-Category:")
    for cat, data in categories.items():
        pct = data["correct"] / data["total"] * 100
        print(f"    {cat:<14}: {data['correct']}/{data['total']} ({pct:.0f}%)")
    print()

    report = {
        "model": model_path, "quantized": quantized, "timestamp": time.time(),
        "accuracy": round(correct_healthometer / len(BENCHMARK_STOCKS) * 100, 1),
        "avg_time_per_query": round(total_time / len(BENCHMARK_STOCKS), 2),
        "results": results,
    }
    report_path = "evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Detailed report saved to {report_path}")
    print(f"{'='*70}")
    return report


def evaluate_model_cloudflare(worker_url):
    import requests
    print(f"{'='*70}")
    print(f"  STOCKSTORY EVALUATION \u2014 Cloudflare Worker Pass-Through")
    print(f"{'='*70}\n")

    results = []
    total_time = 0
    correct_healthometer = 0

    for i, (ticker, instruction, input_text, expected_range, category) in enumerate(BENCHMARK_STOCKS, 1):
        payload = {"instruction": instruction, "input": input_text}
        start = time.time()
        try:
            resp = requests.post(f"{worker_url.rstrip('/')}/api/v1/evaluate", json=payload, timeout=30)
            elapsed = time.time() - start
            total_time += elapsed
            if resp.status_code == 200:
                data = resp.json()
                response_text = data.get("output", "")
            else:
                response_text = f"HTTP {resp.status_code}"
        except Exception as e:
            elapsed = time.time() - start
            total_time += elapsed
            response_text = f"Error: {e}"

        healthometer = extract_healthometer(response_text)
        risk = extract_risk(response_text)

        ho_correct = False
        if healthometer is not None:
            lo, hi = expected_range
            ho_correct = lo <= healthometer <= hi
            if ho_correct:
                correct_healthometer += 1

        results.append({
            "ticker": ticker, "category": category, "expected_range": expected_range,
            "healthometer": healthometer, "risk": risk, "ho_correct": ho_correct,
            "response": response_text[:150], "time": round(elapsed, 2),
        })

        status = "\u2705" if ho_correct else "\u274c"
        print(f"  {status} [{i}/{len(BENCHMARK_STOCKS)}] {ticker:<14} "
              f"HO={healthometer} (expected {expected_range[0]}-{expected_range[1]}) "
              f"Risk={risk or 'N/A'} [{elapsed:.1f}s]")

    print()
    print(f"{'='*70}")
    print(f"  RESULTS SUMMARY")
    print(f"{'='*70}")
    print(f"  Healthometer Accuracy:  {correct_healthometer}/{len(BENCHMARK_STOCKS)} "
          f"({correct_healthometer/len(BENCHMARK_STOCKS)*100:.0f}%)")
    print(f"  Total Time:            {total_time:.1f}s "
          f"({total_time/len(BENCHMARK_STOCKS):.1f}s avg per query)")
    print(f"{'='*70}")
    return {"accuracy": correct_healthometer / len(BENCHMARK_STOCKS) * 100, "results": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate StockStory model against 12-stock benchmark")
    parser.add_argument("--model-path", default="indian_stock_slm_master_gguf/indian_stock_slm_master-Q4_K_M.gguf",
                        help="Path to GGUF model file")
    parser.add_argument("--quantized", action="store_true", help="Model is quantized")
    parser.add_argument("--worker-url", help="Cloudflare Worker URL for remote evaluation")
    args = parser.parse_args()
    if args.worker_url:
        evaluate_model_cloudflare(args.worker_url)
    else:
        evaluate_model_local(args.model_path, args.quantized)
