#!/usr/bin/env python3
"""
hf_hub_sync.py — CodeEX Hugging Face Hub Sync.

Uploads the compiled 4-bit GGUF quantized model (stockex_model_q4.gguf)
to the configured Hugging Face space for distribution and deployment.

Usage:
    export HF_TOKEN=hf_your_token_here
    python3 scripts/python/hf_hub_sync.py --gguf ./codeex-q4.gguf --repo your-username/codeex-model

Requires: huggingface_hub (pip install huggingface_hub)
"""

import argparse
import json
import os
import sys

try:
    from huggingface_hub import HfApi, upload_file
except ImportError:
    print(json.dumps({
        "error": "huggingface_hub not installed. Run: pip install huggingface_hub"
    }))
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="CodeEX Hugging Face Hub Sync")
    parser.add_argument("--gguf", required=True, help="Path to the 4-bit GGUF model file")
    parser.add_argument("--repo", required=True, help="Hugging Face repo ID (e.g. username/codeex)")
    parser.add_argument("--token", default=os.environ.get("HF_TOKEN"),
                        help="Hugging Face API token (or set HF_TOKEN env var)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate without uploading")
    args = parser.parse_args()

    if not args.token:
        print(json.dumps({"error": "HF_TOKEN not set. Provide --token or set HF_TOKEN env var."}))
        sys.exit(1)

    if not os.path.exists(args.gguf):
        print(json.dumps({"error": f"GGUF file not found: {args.gguf}"}))
        sys.exit(1)

    file_size_mb = os.path.getsize(args.gguf) / (1024 * 1024)
    repo_id = args.repo

    if args.dry_run:
        print(json.dumps({
            "status": "dry_run",
            "gguf": args.gguf,
            "repo_id": repo_id,
            "file_size_mb": round(file_size_mb, 2),
            "next": f"huggingface-cli upload {repo_id} {args.gguf} .",
        }))
        return

    api = HfApi(token=args.token)

    try:
        api.create_repo(repo_id=repo_id, exist_ok=True, private=False)
    except Exception as e:
        print(json.dumps({"error": f"Failed to create repo: {e}"}))
        sys.exit(1)

    try:
        url = upload_file(
            path_or_fileobj=args.gguf,
            path_in_repo="codeex-model-q4.gguf",
            repo_id=repo_id,
            token=args.token,
        )
        print(json.dumps({
            "status": "uploaded",
            "repo_id": repo_id,
            "file": "codeex-model-q4.gguf",
            "size_mb": round(file_size_mb, 2),
            "url": url,
        }))
    except Exception as e:
        print(json.dumps({"error": f"Upload failed: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
