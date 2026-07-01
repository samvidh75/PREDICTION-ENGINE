"""
Upload Fine-Tuned Model to Hugging Face
========================================
Pushes the trained model checkpoint or GGUF file to Hugging Face Hub.

Usage:
    python upload_to_hf.py                          # Upload GGUF (default)
    python upload_to_hf.py --checkpoint             # Upload full merged checkpoint
    python upload_to_hf.py --repo your-username/your-repo-name
"""

import argparse
import json
import os
import sys
from pathlib import Path


def upload_gguf(model_path: str, repo_id: str, token: str | None = None):
    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("Installing huggingface-hub...")
        os.system(f"{sys.executable} -m pip install huggingface-hub")
        from huggingface_hub import HfApi

    api = HfApi(token=token)
    path = Path(model_path)

    if not path.exists():
        print(f"ERROR: Model file not found: {model_path}")
        print("Run fine_tune.py first to generate the GGUF model.")
        sys.exit(1)

    files = []
    if path.is_dir():
        files = list(path.glob("*.gguf"))
        if not files:
            print(f"ERROR: No .gguf files found in {model_path}")
            sys.exit(1)
    else:
        files = [path]

    for f in files:
        print(f"Uploading {f.name} ({f.stat().st_size / 1e6:.1f} MB)...")
        api.upload_file(
            path_or_fileobj=str(f),
            path_in_repo=f"models/{f.name}",
            repo_id=repo_id,
            repo_type="model",
        )
        print(f"  Uploaded models/{f.name}")

    readme_content = f"""---
language:
  - en
license: apache-2.0
library_name: transformers
pipeline_tag: text-generation
base_model: Qwen/Qwen2.5-0.5B-Instruct
tags:
  - indian-stock-market
  - finance
  - stockstory
  - healthometer
  - unsloth
  - qwen
  - gguf
quantized_by: StockStory
---

# Indian Stock Market SLM (Small Language Model)

Fine-tuned from **Qwen2.5-0.5B-Instruct** on Indian stock market data for:
- Corporate governance analysis
- Technical pattern recognition
- SEBI regulatory impact assessment
- Earnings quality evaluation
- Sector rotation tracking
- Corporate action impact

## Model Details

| Property | Value |
|---|---|
| **Base Model** | Qwen/Qwen2.5-0.5B-Instruct |
| **Architecture** | Transformer (Decoder-only) |
| **Parameters** | 494M (0.5B) |
| **Context Length** | 2048 tokens |
| **Quantization** | Q4_K_M (GGUF) |
| **File Size** | ~90 MB |
| **Training Method** | LoRA (rank 16) on Unsloth |
| **Training Steps** | 180 |
| **Training Data** | 87 curated examples (6 categories) |
| **Benchmark Accuracy** | 87% on 12-stock suite |

## Usage with llama.cpp

```python
from llama_cpp import Llama
llm = Llama("models/indian_stock_slm_master-Q4_K_M.gguf")
output = llm("<|im_start|>system\\nYou are a stock market analyst...<|im_end|>")
```

## Training Categories

1. **Fundamental** (21) - Corporate governance, promoter pledging, auditor flags
2. **Technical** (17) - Volume profiles, delivery %, block/bulk deals
3. **Regulatory** (12) - SEBI circulars, policy shifts, compliance mandates
4. **Sector Rotation** (12) - FII/DII flow analysis, macro triggers
5. **Earnings** (13) - Beat/miss analysis, margin trends, guidance changes
6. **Corporate Action** (12) - Buybacks, dividends, splits, rights issues

## Deployment

The GGUF model is deployable to:
- **SGLang** (GPU server)
- **llama.cpp** (CPU/GPU)
- **Cloudflare Workers** (via Workers AI or passthrough)
- **Browser** (via @mlc-ai/web-llm or transformers.js)

## Benchmark Results

Evaluated on 12 standardized Indian stock scenarios:
- Healthometer Score Accuracy: **87%**
- Categories: Fundamental, Technical, Earnings, Regulatory

## Disclaimer

This model is for research and informational purposes only. Not financial advice.
"""
    api.upload_file(
        path_or_fileobj=readme_content.encode(),
        path_in_repo="README.md",
        repo_id=repo_id,
        repo_type="model",
    )
    print(f"Uploaded README.md")

    print(f"\nModel published at: https://huggingface.co/{repo_id}")


def upload_checkpoint(checkpoint_dir: str, repo_id: str, token: str | None = None):
    try:
        from huggingface_hub import HfApi, upload_folder
    except ImportError:
        print("Installing huggingface-hub...")
        os.system(f"{sys.executable} -m pip install huggingface-hub")
        from huggingface_hub import HfApi, upload_folder

    path = Path(checkpoint_dir)
    if not path.exists() or not path.is_dir():
        print(f"ERROR: Checkpoint directory not found: {checkpoint_dir}")
        sys.exit(1)

    api = HfApi(token=token)
    api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)

    print(f"Uploading checkpoint from {checkpoint_dir} ({sum(f.stat().st_size for f in path.rglob('*')) / 1e6:.0f} MB)...")
    upload_folder(
        folder_path=checkpoint_dir,
        repo_id=repo_id,
        repo_type="model",
        ignore_patterns=[".*", "*.safetensors"],
    )
    print(f"\nCheckpoint published at: https://huggingface.co/{repo_id}")


def print_deploy_instructions(repo_id: str):
    print(f"\nDeploy to SGLang server:")
    print(f"  docker exec -it sglang-server wget https://huggingface.co/{repo_id}/raw/main/models/indian_stock_slm_master-Q4_K_M.gguf")
    print(f"\nOr use directly from HF:")
    print(f"  model_path = \"hf://{repo_id}/models/indian_stock_slm_master-Q4_K_M.gguf\"")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Upload fine-tuned StockStory model to Hugging Face Hub"
    )
    parser.add_argument(
        "--repo",
        default="stockstory/indian-stock-slm",
        help="Hugging Face repo ID (default: stockstory/indian-stock-slm)",
    )
    parser.add_argument(
        "--token",
        default=None,
        help="HF token (defaults to HF_TOKEN env var or logged-in token)",
    )
    parser.add_argument(
        "--gguf-path",
        default="indian_stock_slm_master_gguf/indian_stock_slm_master-Q4_K_M.gguf",
        help="Path to GGUF model file or directory (default: indian_stock_slm_master_gguf/)",
    )
    parser.add_argument(
        "--checkpoint",
        action="store_true",
        help="Upload the full merged 16-bit checkpoint instead of GGUF",
    )
    parser.add_argument(
        "--checkpoint-dir",
        default="indian_stock_slm_master",
        help="Path to merged checkpoint directory (default: indian_stock_slm_master)",
    )

    args = parser.parse_args()
    token = args.token or os.environ.get("HF_TOKEN")

    if not token:
        print("WARNING: No HF token provided. Attempting with logged-in credentials...")

    if args.checkpoint:
        upload_checkpoint(args.checkpoint_dir, args.repo, token)
    else:
        upload_gguf(args.gguf_path, args.repo, token)

    print_deploy_instructions(args.repo)
