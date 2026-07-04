#!/bin/bash
# Upload fine-tuned LoRA adapter to HuggingFace Hub
# Run this to make the model available for browser-based inference

set -e

echo "🚀 Uploading Fine-Tuned Model to HuggingFace Hub"
echo "=================================================="
echo ""

# Check if huggingface-cli is installed
if ! command -v huggingface-cli &> /dev/null; then
  echo "❌ huggingface-cli not installed"
  echo "   Install with: pip install huggingface-hub[cli]"
  exit 1
fi

# Check if adapter exists
if [ ! -d "stockex_slm_agent_output" ]; then
  echo "❌ Adapter directory not found: stockex_slm_agent_output/"
  exit 1
fi

if [ ! -f "stockex_slm_agent_output/adapter_model.safetensors" ]; then
  echo "❌ Adapter weights not found: stockex_slm_agent_output/adapter_model.safetensors"
  exit 1
fi

echo "✅ Adapter weights found"
echo ""

# Get HF username
read -p "Enter your HuggingFace username: " HF_USERNAME

if [ -z "$HF_USERNAME" ]; then
  echo "❌ HuggingFace username required"
  exit 1
fi

MODEL_ID="${HF_USERNAME}/Qwen2.5-0.5B-stockmarket-encyclopedia"

echo ""
echo "📋 Creating repository: $MODEL_ID"

# Create repo (will use existing if already present)
huggingface-cli repo create \
  "$MODEL_ID" \
  --type model \
  --exist_ok 2>/dev/null || true

echo ""
echo "📤 Uploading model files..."

# Upload entire adapter directory
huggingface-cli upload "$MODEL_ID" \
  stockex_slm_agent_output/ \
  . \
  --repo-type=model

echo ""
echo "✅ Upload complete!"
echo ""
echo "Model available at: https://huggingface.co/$MODEL_ID"
echo ""
echo "Next steps:"
echo "1. Update edgeAiLlmWorkerFineTuned.ts:"
echo "   Change: 'stockex/Qwen2.5-0.5B-stockmarket-encyclopedia'"
echo "   To: '$MODEL_ID'"
echo ""
echo "2. Commit and push:"
echo "   git add src/components/browser-ai/edgeAiLlmWorkerFineTuned.ts"
echo "   git commit -m 'chore: Update fine-tuned model ID to HF Hub'"
echo "   git push origin main"
echo ""
echo "3. Browser AI will now load your fine-tuned model!"
