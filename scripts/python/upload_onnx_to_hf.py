#!/usr/bin/env python3
"""
Upload StockEX ONNX model + LoRA adapter to Hugging Face Hub.

Usage:
    HF_TOKEN=hf_xxx python3 scripts/python/upload_onnx_to_hf.py
    python3 scripts/python/upload_onnx_to_hf.py --token hf_xxx

Creates:
    - stockex/stockex-encyclopedia-slm  (ONNX model for browser inference)
    - stockex/stockex-encyclopedia-adapter  (LoRA adapter for training pipeline)
"""

import argparse, json, os, sys
from pathlib import Path

ONNX_DIR = "/tmp/stockex_onnx"
ADAPTER_DIR = "./stockex_slm_agent_output"
MERGE_DIR = "./stockex_merged_model"

ONNX_REPO = "stockex/stockex-encyclopedia-slm"
ADAPTER_REPO = "stockex/stockex-encyclopedia-adapter"

README_ONNX = """---
language: en
license: apache-2.0
library_name: transformers
pipeline_tag: text-generation
base_model: Qwen/Qwen2.5-0.5B-Instruct
tags:
  - stockstory
  - indian-stock-market
  - finance
  - encyclopedia
  - onnx
---

# StockEX Encyclopedia SLM (ONNX)

Fine-tuned from **Qwen2.5-0.5B-Instruct** on 2,000 Indian stock encyclopedia entries.

This ONNX model is optimized for browser inference via `@huggingface/transformers` (transformers.js).

## Model Details

| Property | Value |
|---|---|
| Base Model | Qwen/Qwen2.5-0.5B-Instruct |
| Parameters | 494M (0.5B) |
| Format | ONNX fp16 |
| File Size | ~980 MB (fp16) |
| Training | LoRA rank=16, 3 epochs, 2k entries |
| Output | Template with `{placeholders}` for live data |

## Usage (transformers.js)

```js
const { AutoTokenizer, AutoModelForCausalLM } = await import('@huggingface/transformers');
const tokenizer = await AutoTokenizer.from_pretrained('stockex/stockex-encyclopedia-slm');
const model = await AutoModelForCausalLM.from_pretrained('stockex/stockex-encyclopedia-slm', {
  device: 'webgpu',
  dtype: 'fp16'
});
```

## Placeholder Resolution

Model outputs templates with `{ticker}`, `{market_cap}`, `{pe_ratio}`, etc.
Use `src/utils/encyclopediaResolver.ts` to fill with live API data.
"""

README_ADAPTER = """---
language: en
license: apache-2.0
library_name: peft
pipeline_tag: text-generation
base_model: Qwen/Qwen2.5-0.5B-Instruct
tags:
  - stockstory
  - indian-stock-market
  - finance
  - encyclopedia
  - lora
---

# StockEX Encyclopedia LoRA Adapter

PEFT LoRA adapter for Qwen2.5-0.5B-Instruct, trained on 2,000 Indian stock encyclopedia entries.

## Usage

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')
model = PeftModel.from_pretrained(base, 'stockex/stockex-encyclopedia-adapter')
```
"""

def upload_dir(repo_id: str, directory: str, token: str, ignore_patterns: list = None):
    from huggingface_hub import HfApi, upload_folder
    api = HfApi(token=token)
    api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
    total = sum(f.stat().st_size for f in Path(directory).rglob("*") if f.is_file())
    print(f"Uploading {directory} ({total / 1e6:.0f} MB) to {repo_id}...")
    upload_folder(
        folder_path=directory,
        repo_id=repo_id,
        repo_type="model",
        ignore_patterns=ignore_patterns or [],
    )
    print(f"  Published: https://huggingface.co/{repo_id}")


def upload_file(repo_id: str, content: str, path_in_repo: str, token: str):
    from huggingface_hub import HfApi
    api = HfApi(token=token)
    api.upload_file(
        path_or_fileobj=content.encode(),
        path_in_repo=path_in_repo,
        repo_id=repo_id,
        repo_type="model",
    )
    print(f"  Uploaded {path_in_repo}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", default=None, help="HF token (or HF_TOKEN env)")
    parser.add_argument("--onnx-only", action="store_true", help="Upload ONNX model only")
    parser.add_argument("--adapter-only", action="store_true", help="Upload adapter only")
    args = parser.parse_args()

    token = args.token or os.environ.get("HF_TOKEN")
    if not token:
        print("ERROR: No HF token. Set HF_TOKEN env var or pass --token.")
        print("Get a token at: https://huggingface.co/settings/tokens")
        sys.exit(1)

    if not args.adapter_only:
        print("=" * 60)
        print("Uploading ONNX model...")
        upload_dir(ONNX_REPO, ONNX_DIR, token, ignore_patterns=[".*", "model.onnx"])
        upload_file(ONNX_REPO, README_ONNX, "README.md", token)
        print()

    if not args.onnx_only:
        print("=" * 60)
        print("Uploading LoRA adapter...")
        upload_dir(ADAPTER_REPO, ADAPTER_DIR, token, ignore_patterns=[".*", "checkpoint-*"])
        upload_file(ADAPTER_REPO, README_ADAPTER, "README.md", token)
        print()

    print("=" * 60)
    print("DONE")
    print(f"  ONNX:    https://huggingface.co/{ONNX_REPO}")
    print(f"  Adapter: https://huggingface.co/{ADAPTER_REPO}")
    print("=" * 60)


if __name__ == "__main__":
    main()
