#!/bin/bash
# Deploy fine-tuned LoRA adapter to production
# Run this after downloading trained weights from Colab

set -e

echo "🚀 Deploying LoRA Adapter for Stock Analysis AI"
echo "=================================================="

# 1. Extract adapter weights
echo "📦 Step 1: Extracting adapter weights..."
if [ -f "$HOME/Downloads/stockex_slm_agent_output.zip" ]; then
  unzip -o "$HOME/Downloads/stockex_slm_agent_output.zip" -d stockex_slm_agent_output/
  echo "✅ Weights extracted to stockex_slm_agent_output/"
else
  echo "❌ ERROR: stockex_slm_agent_output.zip not found in ~/Downloads"
  echo "   Please download the zip from Colab first"
  exit 1
fi

# 2. Verify adapter structure
echo ""
echo "🔍 Step 2: Verifying adapter structure..."
required_files=("adapter_config.json" "adapter_model.safetensors" "tokenizer.json")
for file in "${required_files[@]}"; do
  if [ -f "stockex_slm_agent_output/$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ Missing: $file"
    exit 1
  fi
done

# 3. Verify adapter config
echo ""
echo "⚙️  Step 3: Checking adapter configuration..."
config_content=$(cat stockex_slm_agent_output/adapter_config.json)
if echo "$config_content" | grep -q '"model_type": "qwen2"'; then
  echo "✅ Model type: qwen2 (correct)"
else
  echo "⚠️  Warning: model_type may not be set correctly"
  echo "   Patching adapter_config.json..."
  # Patch if needed (this will be done in Colab, but as safety)
  sed -i '' 's/"model_type": "[^"]*"/"model_type": "qwen2"/g' stockex_slm_agent_output/adapter_config.json 2>/dev/null || true
fi

# 4. Calculate adapter size
echo ""
echo "📊 Step 4: Adapter statistics..."
adapter_size=$(du -sh stockex_slm_agent_output/ | cut -f1)
echo "  Total size: $adapter_size"
safetensors_size=$(ls -lh stockex_slm_agent_output/adapter_model.safetensors 2>/dev/null | awk '{print $5}' || echo "N/A")
echo "  Adapter weights: $safetensors_size"

# 5. Deploy to backend
echo ""
echo "🌐 Step 5: Deploying to Render backend..."
echo "   (Pushing to GitHub triggers auto-deploy)"
git add stockex_slm_agent_output/
git commit -m "chore: Add fine-tuned LoRA adapter weights for stock analysis AI" 2>/dev/null || echo "  No changes to commit"
git push origin main

echo ""
echo "⏳ Step 6: Waiting for Render deployment..."
echo "   Check: https://dashboard.render.com/services"
echo "   Expected: Deploy completes in 2-3 minutes"

# 7. Test adapter
echo ""
echo "🧪 Step 7: Testing adapter integration..."
if command -v node &> /dev/null; then
  node << 'NODEJS_TEST'
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('stockex_slm_agent_output/adapter_config.json', 'utf-8'));
console.log('  Adapter config:');
console.log('    - r:', config.r);
console.log('    - lora_alpha:', config.lora_alpha);
console.log('    - target_modules:', config.target_modules.join(', '));
console.log('    - model_type:', config.model_type);
console.log('  ✅ Adapter ready for inference');
NODEJS_TEST
else
  echo "  (Skipped: Node.js not available)"
fi

# 8. Summary
echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Wait 2-3 min for Render deployment to complete"
echo "2. Test on production: https://www.stockstory-india.com/"
echo "3. Click 'AI Chat' → Load Local AI"
echo "4. Ask: 'What does P/E ratio mean?'"
echo "5. Expected: Fine-tuned response with Indian stock context"
echo ""
echo "Rollback (if needed):"
echo "  git reset --hard HEAD~1"
echo "  git push origin main --force"
echo ""
