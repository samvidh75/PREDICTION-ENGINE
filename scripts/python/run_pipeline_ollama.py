"""
StockStory Ollama Pipeline Orchestrator
========================================
Bridges the fine-tuned SLM (Qwen2.5-0.5B GGUF) into a local Ollama instance.
Generates Modelfile with few-shot dataset injections, registers the model,
and runs local CPU evaluations.

Usage:
    python run_pipeline_ollama.py --compile     # Build Modelfile + register in Ollama
    python run_pipeline_ollama.py --modelfile   # Only generate the Modelfile
    python run_pipeline_ollama.py --benchmark   # Run benchmark evaluation on registered model
    python run_pipeline_ollama.py --serve       # Start Ollama serve with the model

Requirements:
    - Ollama installed (https://ollama.com)
    - GGUF model from fine_tune.py (indian_stock_slm_master_gguf/)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path


class OllamaPipelineOrchestrator:
    def __init__(
        self,
        dataset_path="master_indian_market_train.json",
        model_name="stockstory-slm",
        gguf_dir="indian_stock_slm_master_gguf",
    ):
        self.dataset_path = Path(dataset_path)
        self.model_name = model_name
        self.modelfile_path = Path("Modelfile")

        gguf_files = list(Path(gguf_dir).glob("*.gguf"))
        if gguf_files:
            self.gguf_source = str(gguf_files[0].resolve())
        else:
            self.gguf_source = str(
                Path(gguf_dir) / "indian_stock_slm_master-Q4_K_M.gguf"
            )

    def build_ollama_modelfile(self):
        print("Generating Ollama Modelfile from training parameters...")

        if not os.path.exists(self.gguf_source):
            print(f"GGUF model not found at {self.gguf_source}")
            print("Run fine_tune.py first to generate the model.")
            return False

        gguf_size_mb = os.path.getsize(self.gguf_source) / 1e6
        print(f"  GGUF: {self.gguf_source} ({gguf_size_mb:.0f} MB)")

        modelfile_parts = [
            f"FROM {self.gguf_source}",
            "",
            "PARAMETER temperature 0.1",
            "PARAMETER top_p 0.9",
            'PARAMETER stop "<|im_end|>"',
            'PARAMETER stop "<|im_start|>"',
            "",
            'SYSTEM """You are a dedicated Indian stock market AI chip running locally. '
            'Analyze technical indicators, Healthometer scales, and corporate news to deliver '
            'concise structural risk summaries. Never invent data. '
            'Always include a Healthometer score and risk level in your assessment."""',
            "",
        ]

        try:
            with open(self.dataset_path) as f:
                dataset = json.load(f)

            top_k = min(10, len(dataset))
            print(f"  Injecting {top_k}/{len(dataset)} few-shot examples into Modelfile...")

            for example in dataset[:top_k]:
                modelfile_parts.append(
                    f'MESSAGE user "Task: {example["instruction"]} | Context: {example["input"]}"'
                )
                modelfile_parts.append(
                    f'MESSAGE assistant "{example["output"]}"'
                )

            modelfile_content = "\n".join(modelfile_parts) + "\n"

            with open(self.modelfile_path, "w") as f:
                f.write(modelfile_content)

            print(f"  Modelfile written ({len(modelfile_content)} bytes)")
            print("Modelfile compiled successfully.")
            return True

        except Exception as e:
            print(f"Failed to build Modelfile: {e}")
            return False

    def compile_model_in_ollama(self):
        print(f"Compiling and registering '{self.model_name}' in Ollama...")

        result = subprocess.run(
            ["ollama", "create", self.model_name, "-f", str(self.modelfile_path)],
            capture_output=True, text=True,
        )

        if result.returncode == 0:
            print(result.stdout.strip())
            print(f"Success! '{self.model_name}' is active and ready for inference.")
            return True
        else:
            print(f"Ollama compilation failed: {result.stderr.strip()}")
            return False

    def run_benchmark(self):
        print(f"Running benchmark evaluation on '{self.model_name}'...")

        test_cases = [
            (
                "Fundamental Check",
                "Task: Evaluate corporate governance | "
                "Context: Ticker: SBIN | P/E: 9.6 | Debt/Equity: 0.6 | "
                "Promoter Pledging: 0% | ROCE: 12.2% | "
                "Auditor: Clean opinion with stable asset quality."
            ),
            (
                "Technical Anomaly",
                "Task: Analyze technical price structures | "
                "Context: Ticker: RELIANCE | Last Price: 2490 | "
                "Volume Expansion: 2.6x | Delivery: 72% | "
                "Order Flow: Block deal detected via NSE window."
            ),
            (
                "Regulatory Impact",
                "Task: Assess SEBI regulatory impact | "
                "Context: Sector: Midcap Derivatives | "
                "SEBI Action: Minimum contract value raised to 15 Lakhs, "
                "weekly expiries restricted to 1 per exchange."
            ),
            (
                "Earnings Analysis",
                "Task: Analyze quarterly earnings | "
                "Context: Ticker: TATAMOTORS | Result: Beat | "
                "Revenue Growth: 18.5% | Margin Change: +250bps | "
                "Guidance: Raised | Commentary: JLR margins at 9-year high."
            ),
        ]

        results = []
        for label, prompt in test_cases:
            print(f"  [{label}] ", end="", flush=True)
            start = time.time()

            result = subprocess.run(
                ["ollama", "run", self.model_name, prompt],
                capture_output=True, text=True, timeout=60,
            )

            elapsed = time.time() - start
            output = result.stdout.strip() if result.returncode == 0 else result.stderr.strip()

            import re
            ho_match = re.search(r"Healthometer[:\s]*(\d+)", output)
            risk_match = re.search(r"Risk[:\s]*(\w+)", output)
            ho = ho_match.group(1) if ho_match else "N/A"
            risk = risk_match.group(1) if risk_match else "N/A"

            print(f"HO={ho} Risk={risk} [{elapsed:.1f}s]")
            results.append({
                "test": label, "healthometer": ho, "risk": risk,
                "time": round(elapsed, 2), "output": output[:200],
            })

        print()
        print("=" * 60)
        print("  BENCHMARK SUMMARY")
        print("=" * 60)
        for r in results:
            status = "PASS" if r["healthometer"] != "N/A" else "FAIL"
            print(f"  [{status}] {r['test']:<20} HO={r['healthometer']} "
                  f"Risk={r['risk']} ({r['time']}s)")

        return results

    def serve(self):
        print(f"Starting Ollama with model '{self.model_name}' on port 11434...")
        print("Press Ctrl+C to stop.")
        os.execvp("ollama", ["ollama", "run", self.model_name])

    def remove(self):
        print(f"Removing model '{self.model_name}' from Ollama...")
        result = subprocess.run(
            ["ollama", "rm", self.model_name],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            print(f"Model '{self.model_name}' removed.")
        else:
            print(f"Failed to remove: {result.stderr.strip()}")

    def info(self):
        print(f"  Model name:   {self.model_name}")
        print(f"  GGUF source:  {self.gguf_source}")
        print(f"  Dataset:      {self.dataset_path}")
        print(f"  Modelfile:    {self.modelfile_path}")

        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if self.model_name in line:
                    print(f"  Ollama status: Registered")
                    print(f"  Details:       {line.strip()}")
                    return

        print(f"  Ollama status: Not registered (run --compile)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StockStory Ollama Pipeline Orchestrator"
    )
    parser.add_argument(
        "--model", default="stockstory-slm",
        help="Ollama model name (default: stockstory-slm)"
    )
    parser.add_argument(
        "--dataset", default="master_indian_market_train.json",
        help="Path to training dataset JSON"
    )
    parser.add_argument(
        "--gguf-dir", default="indian_stock_slm_master_gguf",
        help="Directory containing GGUF model files"
    )

    action = parser.add_mutually_exclusive_group()
    action.add_argument(
        "--compile", action="store_true",
        help="Build Modelfile and register model in Ollama"
    )
    action.add_argument(
        "--modelfile", action="store_true",
        help="Only generate the Modelfile (no registration)"
    )
    action.add_argument(
        "--benchmark", action="store_true",
        help="Run benchmark evaluation on registered model"
    )
    action.add_argument(
        "--serve", action="store_true",
        help="Start interactive Ollama session with the model"
    )
    action.add_argument(
        "--remove", action="store_true",
        help="Remove the model from Ollama"
    )
    action.add_argument(
        "--info", action="store_true",
        help="Show model configuration and registration status"
    )

    args = parser.parse_args()

    orch = OllamaPipelineOrchestrator(
        dataset_path=args.dataset,
        model_name=args.model,
        gguf_dir=args.gguf_dir,
    )

    if args.compile:
        if orch.build_ollama_modelfile():
            orch.compile_model_in_ollama()
            orch.run_benchmark()

    elif args.modelfile:
        orch.build_ollama_modelfile()

    elif args.benchmark:
        orch.run_benchmark()

    elif args.serve:
        orch.serve()

    elif args.remove:
        orch.remove()

    elif args.info:
        orch.info()

    else:
        if orch.build_ollama_modelfile():
            orch.compile_model_in_ollama()
            orch.run_benchmark()
