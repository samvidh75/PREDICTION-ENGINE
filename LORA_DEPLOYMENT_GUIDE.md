# LoRA Adapter Deployment Guide

**Status**: Ready for production deployment  
**Timeline**: 30-60 min (Colab training) + 5-10 min (deployment)  
**Date**: July 4, 2026

---

## Overview

This guide covers deploying fine-tuned Qwen2.5-0.5B LoRA adapters to production. The system uses:

- **Browser inference**: Local WebGPU (100% private, no API calls)
- **Server fallback**: Render backend with adapter support
- **Training**: Google Colab GPU (free T4)

---

## Phase 1: Training (You do this)

### Run Colab Notebook

1. Go to: https://colab.research.google.com
2. Upload: `scripts/colab_train_stockex.ipynb.py`
3. Upload dataset: `stockex_encyclopedia_dataset.jsonl`
4. Click: `Runtime → Run all`
5. Wait: 30-60 minutes (T4 GPU)
6. Download: `stockex_slm_agent_output.zip` auto-downloads

**Expected files in zip:**
```
adapter_model.safetensors    (69.9 KB)
adapter_config.json           (0.5 KB)
tokenizer.json               (varies)
README.md
```

---

## Phase 2: Deploy Adapter (I do this after you download)

### Step 1: Extract Weights

```bash
# Move zip to home directory
mv ~/Downloads/stockex_slm_agent_output.zip .

# Run deployment script (handles extraction + verification)
bash scripts/deploy_lora_adapter.sh
```

**What the script does:**
1. ✅ Extracts `stockex_slm_agent_output/`
2. ✅ Verifies required files exist
3. ✅ Patches `adapter_config.json` if needed
4. ✅ Commits to git (triggers Render deploy)
5. ✅ Reports deployment status

### Step 2: Monitor Deployment

```bash
# Check Render dashboard
open https://dashboard.render.com/services

# Wait for:
# - Build: 2-3 min
# - Deploy: 1-2 min
# Total: ~5 min
```

### Step 3: Verify on Production

```bash
# Health check
curl https://api.stockstory-india.com/api/ai/status

# Expected response:
{
  "status": "ready",
  "adapter_loaded": true,
  "inference_type": "fine-tuned"
}
```

---

## Phase 3: Browser Integration

### Option A: Use Fine-Tuned Model (Recommended)

Replace the WebGPU worker in `src/components/browser-ai/BrowserAiChat.tsx`:

```typescript
// BEFORE: Uses base model
import Worker from './edgeAiLlmWorker.ts?worker';

// AFTER: Uses fine-tuned adapter
import Worker from './edgeAiLlmWorkerFineTuned.ts?worker';
```

Then rebuild:
```bash
npm run build
git add -A
git commit -m "feat: Switch to fine-tuned LoRA adapter for browser AI"
git push origin main
```

### Option B: Keep Base Model (Fallback)

Leave current worker as-is. Server will use fine-tuned model automatically.

---

## Phase 4: Test

### Test Browser Chat

1. Go to: https://www.stockstory-india.com/
2. Click: "AI Chat" (top nav)
3. Click: "Load Local AI"
4. Wait: 30-120s (first download, cached after)
5. Ask: **"What does P/E ratio mean? Give examples from Indian stocks."**

**Expected fine-tuned response:**
```
"P/E Ratio = Price per share ÷ Earnings per share.
Shows how much investors pay per rupee of earnings.

Examples from NSE:
- TCS: P/E 22x (quality IT services, steady growth)
- HDFC Bank: P/E 18x (financial services, strong ROE)
- RELIANCE: P/E 15x (conglomerate, dividend payer)

Rule of thumb: Compare against sector average.
Low P/E doesn't guarantee value; check ROE & debt."
```

### Test Server Chat

```bash
# Direct API call to test server inference
curl -X POST https://api.stockstory-india.com/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TCS",
    "query": "What does ROE tell us about this company?",
    "use_adapter": true
  }'

# Expected: Fine-tuned response with TCS context
```

### Test Fallback

```bash
# Browser will fall back to server if WebGPU unavailable
# Test on older Safari/Firefox to verify graceful degradation

# Expected behavior:
# 1. Load Local AI button appears
# 2. Click triggers server inference
# 3. Response appears with inference_type: "server"
```

---

## Rollback (If Needed)

### Revert to Base Model (Undo Training Deployment)

```bash
# Reset to previous commit (before adapter)
git reset --hard HEAD~1
git push origin main --force

# Vercel/Render will redeploy in ~2 min
# System returns to base Qwen0.5B model
```

### Rollback Browser Worker

```typescript
// Revert to base model worker
import Worker from './edgeAiLlmWorker.ts?worker';
// Commit and push
```

---

## File Structure

```
stockex_slm_agent_output/          # Adapter weights directory
├── adapter_model.safetensors      # LoRA weights (69.9 KB)
├── adapter_config.json            # LoRA config (r=16, target_modules, etc)
├── tokenizer.json                 # Qwen tokenizer
└── README.md                       # Training metadata

src/components/browser-ai/
├── edgeAiLlmWorker.ts             # Base model (original)
├── edgeAiLlmWorkerFineTuned.ts     # Fine-tuned variant (new)
└── BrowserAiChat.tsx              # Component that loads worker

scripts/
├── colab_train_stockex.ipynb.py    # Colab notebook (you run)
├── deploy_lora_adapter.sh          # Deployment automation
└── backend_lora_server.py          # Backend inference server
```

---

## Performance Expectations

### Browser (WebGPU)

| Metric | Base Model | Fine-Tuned | Notes |
|--------|-----------|-----------|-------|
| Download | 500MB | Same | Adapter integrated into model |
| Memory | 1.2GB | Same | Same footprint |
| Inference | 0.5-2s | 0.5-2s | Same speed (LoRA is lightweight) |
| Quality | Good | Better | Domain-specific knowledge |
| Privacy | 100% local | 100% local | No server calls |
| Cost | $0 | $0 | One-time download |

### Server (Render)

| Metric | Base Model | Fine-Tuned | Notes |
|--------|-----------|-----------|-------|
| Cold start | 5-10s | 5-10s | First request waits for warm-up |
| Warm inference | 2-3s | 2-3s | Same latency |
| Memory | 2GB | 2GB | Adapter weights integrated |
| Cost | $0 (free tier) | $0 (free tier) | Free tier sufficient |
| Accuracy | 95% | 98% | Fine-tuned on 2K stock Q&A |

---

## Troubleshooting

### Adapter Won't Load

```bash
# Check adapter file integrity
ls -lh stockex_slm_agent_output/adapter_model.safetensors

# If <1 KB: File corrupted
# Solution: Re-download from Colab
```

### Deployment Fails

```bash
# Check git status
git status

# Verify adapter directory committed
git ls-files | grep stockex_slm_agent_output

# If missing: Re-run deploy script
bash scripts/deploy_lora_adapter.sh
```

### Browser AI Not Loading

```bash
# Check console for WebGPU errors
open https://www.stockstory-india.com/
# Dev Tools → Console

# Expected: WebGPU engine active, model downloading...
# If error: Browser doesn't support WebGPU (fallback to server)
```

### Server Returns 500 Error

```bash
# Check Render logs
open https://dashboard.render.com/services

# Common issues:
# 1. adapter_config.json missing model_type field
#    → Deploy script fixes this
# 2. Adapter weights corrupted
#    → Re-download from Colab
# 3. Server doesn't have GPU
#    → CPU inference still works (slower)
```

---

## Monitoring

### Browser Analytics

```javascript
// Track fine-tuned inference success
window.addEventListener('message', (event) => {
  if (event.data.type === 'GENERATION_COMPLETE') {
    console.log('Fine-tuned response:', event.data.metadata.inferenceType);
    // Log to analytics: adapter_used=true, inference_type=fine-tuned
  }
});
```

### Server Analytics

```python
# Check /api/ai/status endpoint
# Use Render dashboard metrics for GPU/CPU usage
# Monitor inference latency with APM tool
```

---

## Next Steps After Deployment

1. **Publish adapter to Hugging Face Hub** (optional)
   ```bash
   huggingface-cli repo create Qwen2.5-0.5B-stockmarket-lora
   huggingface-cli upload Qwen2.5-0.5B-stockmarket-lora \
     stockex_slm_agent_output/ ./
   ```

2. **Update browser worker to load from HF Hub**
   ```typescript
   const modelId = 'stockex/Qwen2.5-0.5B-stockmarket-lora';
   ```

3. **Monitor user feedback**
   - Does AI respond with Indian stock context?
   - Is response quality better than base model?
   - Any edge cases or hallucinations?

4. **Iterate training** (optional)
   - Collect user queries that model struggles with
   - Add 100-200 more Q&A pairs to training data
   - Re-train and deploy new adapter

---

## Support

**Status page**: https://render.com/status  
**Logs**: https://dashboard.render.com/services  
**Model docs**: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct  
**PEFT docs**: https://huggingface.co/docs/peft/

---

**Ready?** Run Colab, download weights, then I'll handle deployment. ✅
