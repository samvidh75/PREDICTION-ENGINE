#!/bin/bash
# cron/cloudflare_tune.sh — Cloudflare Workers AI Serverless LoRA Deployment Pipeline
# Triggers distributed fine-tuning of the StockEX encyclopedia model on Cloudflare edge.
# Run weekly via crontab:
#   0 2 * * 0 /path/to/cron/cloudflare_tune.sh >> /var/log/cloudflare_tune.log 2>&1

set -euo pipefail

CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?Missing CLOUDFLARE_ACCOUNT_ID}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:?Missing CLOUDFLARE_API_TOKEN}"
DATASET_FILE="stockex_encyclopedia_dataset.jsonl"
MODEL_BASE="@cf/meta/llama-3-8b-instruct"

CF_API_BASE="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}"

echo "[$(date)] Starting Cloudflare Workers AI fine-tuning pipeline..."

# 1. Compile fresh encyclopedia dataset from Neon PostgreSQL
python3 scripts/python/compile_encyclopedia.py

if [ ! -f "${DATASET_FILE}" ]; then
    echo "ERROR: Dataset file ${DATASET_FILE} not found after compilation."
    exit 1
fi

# 2. Upload dataset to Cloudflare Workers AI storage
echo "Uploading dataset to Cloudflare Workers AI..."
UPLOAD_RES=$(curl -s -X POST "${CF_API_BASE}/ai/finetuning/datasets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -F "file=@${DATASET_FILE}" \
    -F "name=stockex_encyclopedia_v1")

DATASET_ID=$(echo "${UPLOAD_RES}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('id',''))" 2>/dev/null || echo "")

if [ -z "${DATASET_ID}" ]; then
    echo "ERROR: Failed to extract dataset ID from upload response."
    echo "${UPLOAD_RES}"
    exit 1
fi

echo "Dataset uploaded. Remote ID: ${DATASET_ID}"

# 3. Trigger serverless distributed LoRA training job
echo "Launching remote LoRA fine-tune..."
JOB_RES=$(curl -s -X POST "${CF_API_BASE}/ai/finetuning/jobs" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"model\": \"${MODEL_BASE}\",
        \"dataset_id\": \"${DATASET_ID}\",
        \"name\": \"stockex_encyclopedia_slm\",
        \"parameters\": {
            \"epochs\": 3,
            \"learning_rate\": 2e-4
        }
    }")

echo "Training job response:"
echo "${JOB_RES}" | python3 -m json.tool 2>/dev/null || echo "${JOB_RES}"

echo "[$(date)] Cloudflare fine-tuning pipeline complete."
