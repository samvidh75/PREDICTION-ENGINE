#!/bin/bash
# cron/cloudflare_tune.sh — Cloudflare Workers AI Serverless LoRA Deployment Pipeline
# Creates/updates a finetune entry and uploads LoRA adapter weights to Cloudflare edge.
# Prerequisites:
#   - LoRA adapter files (adapter_model.safetensors, adapter_config.json) in FINETUNE_DIR
#   - adapter_config.json must include "model_type": "gemma"
# Run weekly via crontab:
#   0 2 * * 0 /path/to/cron/cloudflare_tune.sh >> /var/log/cloudflare_tune.log 2>&1

set -euo pipefail

CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?Missing CLOUDFLARE_ACCOUNT_ID}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:?Missing CLOUDFLARE_API_TOKEN}"

# Compatible LoRA model on Cloudflare (Gemma-2B, closest to our 0.5B target)
MODEL_LORA="@cf/google/gemma-2b-it-lora"
FINETUNE_NAME="stockex_encyclopedia_slm"
FINETUNE_DIR="./finetune_artifacts"

CF_API_BASE="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}"

echo "[$(date)] Starting Cloudflare Workers AI LoRA deployment pipeline..."

# 1. Check that LoRA adapter files exist
if [ ! -f "${FINETUNE_DIR}/adapter_model.safetensors" ] || [ ! -f "${FINETUNE_DIR}/adapter_config.json" ]; then
    echo "ERROR: LoRA adapter files not found in ${FINETUNE_DIR}/"
    echo "Run scripts/python/cloud_train.py first to train the adapter."
    exit 1
fi

# 2. Create or update the finetune entry on Cloudflare
echo "Creating finetune entry '${FINETUNE_NAME}' for model ${MODEL_LORA}..."
FINETUNE_RES=$(curl -s -X POST "${CF_API_BASE}/ai/finetunes" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"model\": \"${MODEL_LORA}\",
        \"name\": \"${FINETUNE_NAME}\",
        \"description\": \"StockEX encyclopedia LoRA for Indian market financial analysis\"
    }")

FINETUNE_ID=$(echo "${FINETUNE_RES}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('id',''))" 2>/dev/null || echo "")

if [ -z "${FINETUNE_ID}" ]; then
    echo "ERROR: Failed to create finetune entry."
    echo "${FINETUNE_RES}" | python3 -m json.tool
    exit 1
fi

echo "Finetune created. ID: ${FINETUNE_ID}"

# 3. Upload LoRA adapter weights and config
echo "Uploading adapter_model.safetensors..."
UPLOAD_WEIGHTS=$(curl -s -X POST "${CF_API_BASE}/ai/finetunes/${FINETUNE_ID}/finetune-assets/" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -F "file_name=adapter_model.safetensors" \
    -F "file=@${FINETUNE_DIR}/adapter_model.safetensors")

if ! echo "${UPLOAD_WEIGHTS}" | python3 -c "import sys,json; sys.exit(0 if json.load(sys.stdin).get('success') else 1)" 2>/dev/null; then
    echo "ERROR: Failed to upload adapter_model.safetensors"
    echo "${UPLOAD_WEIGHTS}" | python3 -m json.tool
    exit 1
fi

echo "Uploading adapter_config.json..."
UPLOAD_CONFIG=$(curl -s -X POST "${CF_API_BASE}/ai/finetunes/${FINETUNE_ID}/finetune-assets/" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -F "file_name=adapter_config.json" \
    -F "file=@${FINETUNE_DIR}/adapter_config.json")

if ! echo "${UPLOAD_CONFIG}" | python3 -c "import sys,json; sys.exit(0 if json.load(sys.stdin).get('success') else 1)" 2>/dev/null; then
    echo "ERROR: Failed to upload adapter_config.json"
    echo "${UPLOAD_CONFIG}" | python3 -m json.tool
    exit 1
fi

echo "LoRA adapter files uploaded successfully."

echo "[$(date)] Cloudflare fine-tuning pipeline complete. Adapter ready for inference as '${FINETUNE_NAME}'."
