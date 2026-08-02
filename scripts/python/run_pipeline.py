"""
StockStory Training Pipeline Orchestrator
==========================================
End-to-end pipeline: build dataset → fine-tune → evaluate → upload.

Usage:
    python run_pipeline.py                      # Full pipeline (dataset → train → evaluate)
    python run_pipeline.py --skip-train         # Dataset only
    python run_pipeline.py --skip-eval          # Dataset + train, skip eval
    python run_pipeline.py --upload             # Dataset → train → eval → upload to HF
    python run_pipeline.py --cloudflare-deploy  # Also deploy worker to Cloudflare

Environment:
    HF_TOKEN            Hugging Face token (for --upload)
    CLOUDFLARE_API_TOKEN  Cloudflare API token (for --cloudflare-deploy)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

START = time.time()

def log(msg):
    elapsed = time.time() - START
    print(f"[{elapsed:6.1f}s] {msg}")

def step(name, command, cwd=None):
    log(f"▶ {name}")
    result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  STDERR: {result.stderr[:500]}")
        print(f"  STDOUT: {result.stdout[:200]}")
        log(f"✖ {name} FAILED (exit {result.returncode})")
        sys.exit(1)
    if result.stdout.strip():
        print(f"  {result.stdout.strip()[:200]}")
    log(f"✓ {name} completed")
    return result.stdout.strip()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StockStory end-to-end training pipeline")
    parser.add_argument("--skip-train", action="store_true", help="Skip fine-tuning step")
    parser.add_argument("--skip-eval", action="store_true", help="Skip evaluation step")
    parser.add_argument("--upload", action="store_true", help="Upload model to Hugging Face")
    parser.add_argument("--cloudflare-deploy", action="store_true", help="Deploy Cloudflare Worker")
    parser.add_argument("--hf-repo", default="stockstory/indian-stock-slm", help="HF repo ID")
    parser.add_argument("--dataset-only", action="store_true", help="Only build the dataset")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    os.chdir(script_dir)

    try:
        cols, _ = os.get_terminal_size()
    except OSError:
        cols = 70
    print("=" * cols)
    print("  STOCKSTORY TRAINING PIPELINE")
    print("=" * cols)
    print(f"  Steps: dataset_builder", end="")
    if not args.skip_train and not args.dataset_only:
        print(" → fine_tune", end="")
        if not args.skip_eval:
            print(" → evaluate", end="")
    if args.upload:
        print(" → upload_to_hf", end="")
    if args.cloudflare_deploy:
        print(" → cloudflare_deploy", end="")
    print()
    print(f"  Started: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * cols)

    # ── Step 1: Generate Dataset ──────────────────────────────
    dataset_path = script_dir / "master_indian_market_train.json"
    log("Building master dataset...")
    step("dataset_builder.py", f"{sys.executable} dataset_builder.py")

    if not dataset_path.exists():
        log("Dataset file not found after builder run")
        sys.exit(1)

    with open(dataset_path) as f:
        count = len(json.load(f))
    log(f"Dataset: {count} training examples in {dataset_path.name}")

    if args.dataset_only:
        log("Dataset-only mode. Stopping.")
        sys.exit(0)

    # ── Step 2: Verify fine_tune.py exists ────────────────────
    fine_tune_path = script_dir / "fine_tune.py"
    if not fine_tune_path.exists():
        log("fine_tune.py not found. Place it in scripts/python/")
        sys.exit(1)

    print()
    print("─" * cols)
    print("  NEXT STEP: Fine-tune on GPU")
    print("─" * cols)
    print()
    print("  Run fine_tune.py on a GPU machine (Colab/Kaggle):")
    print()
    print(f"    >> python fine_tune.py")
    print()
    print("  This will:")
    print(f"    1. Load Qwen2.5-0.5B-Instruct with 4-bit LoRA")
    print(f"    2. Train on {count} examples for 180 steps")
    print(f"    3. Save merged 16-bit model to indian_stock_slm_master/")
    print(f"    4. Export GGUF to indian_stock_slm_master_gguf/")
    print()
    print("  Requirements: CUDA GPU with 6GB+ VRAM")
    print("  Install: pip install unsloth torch trl transformers datasets")
    print()

    if not args.skip_train:
        gpu_available = False
        try:
            import torch
            gpu_available = torch.cuda.is_available()
        except ImportError:
            pass

        if gpu_available:
            log("GPU detected — running fine_tune.py")
            step("fine_tune.py", f"{sys.executable} fine_tune.py")
        else:
            log("No GPU detected locally. fine_tune.py requires a GPU (Colab/Kaggle).")
            log("Skipping local training. Run manually on GPU.")
            if not args.skip_eval:
                log("Cannot evaluate without trained model. Use --skip-eval or train first.")
                sys.exit(0)

    # ── Step 3: Evaluate ──────────────────────────────────────
    gguf_path = (
        script_dir / "indian_stock_slm_master_gguf" / "indian_stock_slm_master-Q4_K_M.gguf"
    )

    if not args.skip_eval:
        if gguf_path.exists():
            log(f"Evaluating model: {gguf_path}")
            try:
                step("evaluate_model.py", f"{sys.executable} evaluate_model.py --model-path \"{gguf_path}\" --quantized")
            except SystemExit:
                log("Evaluation failed (llama-cpp-python may not be installed)")
        else:
            log(f"GGUF model not found at {gguf_path}")
            log("Run fine_tune.py first or specify a different model path")

    # ── Step 4: Upload to Hugging Face ──────────────────────
    if args.upload:
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            log("HF_TOKEN not set. Skipping upload.")
        else:
            upload_path = script_dir / "upload_to_hf.py"
            if not upload_path.exists():
                log("upload_to_hf.py not found")
            elif gguf_path.exists():
                log(f"Uploading {gguf_path.name} to {args.hf_repo}")
                step("upload_to_hf.py",
                     f"{sys.executable} upload_to_hf.py --repo {args.hf_repo}")
            else:
                log(f"Model file not found. Run fine_tune.py first.")

    # ── Step 5: Deploy Cloudflare Worker ─────────────────────
    if args.cloudflare_deploy:
        worker_dir = script_dir.parent.parent / "workers-api"
        if not (worker_dir / "wrangler.toml").exists():
            log("workers-api/wrangler.toml not found. Skipping deploy.")
        else:
            log("Deploying Cloudflare Worker...")
            step("wrangler deploy", "npx wrangler deploy", cwd=str(worker_dir))

    # ── Done ─────────────────────────────────────────────────
    total = time.time() - START
    print("=" * cols)
    print(f"  PIPELINE COMPLETE ({total:.1f}s)")
    print(f"  Dataset: {count} examples")
    if gguf_path.exists():
        size_mb = gguf_path.stat().st_size / 1e6
        print(f"  GGUF Model: {gguf_path.name} ({size_mb:.0f} MB)")
    print("=" * cols)
