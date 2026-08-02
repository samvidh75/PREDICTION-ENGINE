#!/bin/bash
# Start SGLang server locally (Apple Silicon CPU mode)
# Uses Qwen2.5-1.5B-Instruct for lightweight CPU inference

set -e

MODEL="${SGLANG_MODEL:-Qwen/Qwen2.5-1.5B-Instruct}"
PORT="${SGLANG_PORT:-30000}"

echo "Starting SGLang server with model: $MODEL"
echo "Port: $PORT"
echo "Device: cpu"
echo ""

# Install dependencies if needed
pip3 install sglang transformers sentencepiece torch --quiet 2>/dev/null || true

# Start SGLang
python3 -m sglang.launch_server \
  --model-path "$MODEL" \
  --device cpu \
  --port "$PORT" \
  --max-running-requests 4 \
  --max-total-tokens 8192

echo "SGLang server stopped."
