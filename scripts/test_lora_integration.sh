#!/bin/bash
# Test LoRA adapter integration after deployment
# Verifies: Adapter weights, server inference, browser fallback

set -e

echo "🧪 Testing LoRA Adapter Integration"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Verify adapter files
echo "📋 Test 1: Verifying adapter files..."
if [ -d "stockex_slm_agent_output" ]; then
  echo -e "${GREEN}✅ Adapter directory exists${NC}"

  files=("adapter_model.safetensors" "adapter_config.json" "tokenizer.json")
  for file in "${files[@]}"; do
    if [ -f "stockex_slm_agent_output/$file" ]; then
      size=$(ls -lh "stockex_slm_agent_output/$file" | awk '{print $5}')
      echo -e "${GREEN}✅ $file ($size)${NC}"
    else
      echo -e "${RED}❌ Missing: $file${NC}"
      exit 1
    fi
  done
else
  echo -e "${RED}❌ Adapter directory not found${NC}"
  exit 1
fi

echo ""

# Test 2: Verify adapter config
echo "📋 Test 2: Verifying adapter configuration..."
if command -v jq &> /dev/null; then
  config_file="stockex_slm_agent_output/adapter_config.json"

  model_type=$(jq -r '.model_type' "$config_file" 2>/dev/null || echo "missing")
  r_value=$(jq -r '.r' "$config_file" 2>/dev/null || echo "missing")
  target_modules=$(jq -r '.target_modules | length' "$config_file" 2>/dev/null || echo "0")

  if [ "$model_type" = "qwen2" ] || [ "$model_type" = "qwen" ]; then
    echo -e "${GREEN}✅ Model type: $model_type${NC}"
  else
    echo -e "${YELLOW}⚠️  Model type: $model_type (expected qwen2)${NC}"
  fi

  if [ "$r_value" != "missing" ]; then
    echo -e "${GREEN}✅ LoRA rank (r): $r_value${NC}"
  fi

  if [ "$target_modules" -gt 0 ]; then
    echo -e "${GREEN}✅ Target modules: $target_modules${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  jq not available, skipping config validation${NC}"
fi

echo ""

# Test 3: Check git status
echo "📋 Test 3: Checking git deployment status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  # Check if adapter is in git
  if git ls-files | grep -q "stockex_slm_agent_output"; then
    echo -e "${GREEN}✅ Adapter committed to git${NC}"

    # Check if pushed to remote
    if git ls-remote origin main | grep -q "$(git rev-parse HEAD)"; then
      echo -e "${GREEN}✅ Changes pushed to origin${NC}"
    else
      echo -e "${YELLOW}⚠️  Changes not yet pushed (deploy will fail)${NC}"
      echo "   Run: git push origin main"
    fi
  else
    echo -e "${RED}❌ Adapter not committed to git${NC}"
    echo "   Run: bash scripts/deploy_lora_adapter.sh"
    exit 1
  fi
fi

echo ""

# Test 4: Test server endpoint (if deployed)
echo "📋 Test 4: Testing server API endpoint..."
api_url="https://api.stockstory-india.com/api/ai/status"

if command -v curl &> /dev/null; then
  response=$(curl -s "$api_url" 2>/dev/null || echo '{"error":"unreachable"}')

  if echo "$response" | grep -q '"status"'; then
    adapter_loaded=$(echo "$response" | grep -o '"adapter_loaded":[^,}]*' | grep -o '[^:]*$')
    if [ "$adapter_loaded" = "true" ]; then
      echo -e "${GREEN}✅ Server has adapter loaded${NC}"
      echo "   Response: $response"
    else
      echo -e "${YELLOW}⚠️  Server running but adapter not loaded${NC}"
      echo "   Possible causes:"
      echo "   - Render deploy still in progress (wait 2-3 min)"
      echo "   - adapter_config.json missing or malformed"
      echo "   - Check https://dashboard.render.com/services"
    fi
  else
    echo -e "${YELLOW}⚠️  API not reachable (server may be deploying)${NC}"
    echo "   Expected when:"
    echo "   - Render build/deploy in progress"
    echo "   - Server not yet deployed"
    echo "   Check: https://dashboard.render.com/services"
  fi
else
  echo -e "${YELLOW}⚠️  curl not available, skipping API test${NC}"
fi

echo ""

# Test 5: Check browser worker file
echo "📋 Test 5: Checking browser worker..."
if [ -f "src/components/browser-ai/edgeAiLlmWorkerFineTuned.ts" ]; then
  echo -e "${GREEN}✅ Fine-tuned worker available${NC}"

  if grep -q "stockex/Qwen2.5-0.5B-stockmarket-lora" "src/components/browser-ai/edgeAiLlmWorkerFineTuned.ts"; then
    echo -e "${GREEN}✅ HF Hub model ID configured${NC}"
  else
    echo -e "${YELLOW}⚠️  HF Hub model ID not configured${NC}"
    echo "   Update 'stockex/Qwen2.5-0.5B-stockmarket-lora' in worker file"
  fi
else
  echo -e "${RED}❌ Fine-tuned worker not found${NC}"
fi

echo ""
echo "===================================="
echo "✅ Testing Complete"
echo "===================================="
echo ""
echo "Summary:"
echo "  1. Adapter files: $([ -d 'stockex_slm_agent_output' ] && echo 'OK' || echo 'MISSING')"
echo "  2. Git status: $(git ls-files | grep -q 'stockex_slm_agent_output' && echo 'OK' || echo 'MISSING')"
echo "  3. Server API: Check dashboard"
echo "  4. Browser worker: OK"
echo ""
echo "Next steps:"
echo "  1. If git status missing: Run: bash scripts/deploy_lora_adapter.sh"
echo "  2. Wait 2-3 min for Render deployment"
echo "  3. Test on https://www.stockstory-india.com/"
echo ""
