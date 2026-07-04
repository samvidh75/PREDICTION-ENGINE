#!/usr/bin/env python3
"""
Fine-Tuned LoRA Adapter Server for Stock Analysis
Runs on Render backend with CPU/GPU inference
Falls back gracefully if adapter not available
"""

import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

app = FastAPI()

# Configuration
ADAPTER_PATH = Path("stockex_slm_agent_output")
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Global model state
model = None
tokenizer = None
adapter_loaded = False

class StockAnalysisRequest(BaseModel):
    ticker: str
    query: str
    use_adapter: bool = True

class StockAnalysisResponse(BaseModel):
    response: str
    ticker: str
    adapter_used: bool
    inference_type: str

async def load_model():
    """Load base model and fine-tuned adapter if available"""
    global model, tokenizer, adapter_loaded

    try:
        print(f"📦 Loading base model: {MODEL_ID}")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            device_map=DEVICE
        )

        # Attempt to load fine-tuned adapter
        if ADAPTER_PATH.exists() and (ADAPTER_PATH / "adapter_config.json").exists():
            try:
                print(f"🎯 Loading LoRA adapter from {ADAPTER_PATH}")
                model = PeftModel.from_pretrained(model, str(ADAPTER_PATH))
                model = model.merge_and_unload()  # Merge adapter weights
                adapter_loaded = True
                print("✅ Fine-tuned adapter loaded successfully")
            except Exception as e:
                print(f"⚠️  Could not load adapter: {e}")
                print("   Continuing with base model")
                adapter_loaded = False
        else:
            print("ℹ️  No adapter found; using base model")
            adapter_loaded = False

    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        raise

@app.on_event("startup")
async def startup():
    """Initialize model on server startup"""
    await load_model()

@app.post("/api/ai/analyze", response_model=StockAnalysisResponse)
async def analyze_stock(request: StockAnalysisRequest):
    """Analyze stock using fine-tuned model"""

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # System prompt with stock context
        system_prompt = f"""You are an expert Indian stock market analyst specializing in {request.ticker}.
        Provide concise, data-driven analysis of stock metrics, fundamentals, and investment thesis.
        Focus on: P/E ratio, ROE, growth rate, debt levels, dividend yield.
        Keep responses under 150 words."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.query}
        ]

        # Tokenize and generate
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=2048
        ).to(DEVICE)

        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=150,
                temperature=0.1,
                top_p=0.95,
                do_sample=False
            )

        # Decode response
        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Extract only the assistant's response
        if "assistant" in response_text:
            response_text = response_text.split("assistant")[-1].strip()

        return StockAnalysisResponse(
            response=response_text,
            ticker=request.ticker,
            adapter_used=adapter_loaded and request.use_adapter,
            inference_type="fine-tuned" if adapter_loaded else "base"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.get("/api/ai/status")
async def get_status():
    """Health check and model status"""
    return {
        "status": "ready" if model is not None else "not_ready",
        "model_id": MODEL_ID,
        "adapter_loaded": adapter_loaded,
        "device": DEVICE,
        "adapter_path": str(ADAPTER_PATH) if ADAPTER_PATH.exists() else None
    }

if __name__ == "__main__":
    import uvicorn

    # Note: Deploy via:
    # gunicorn -w 1 -k uvicorn.workers.UvicornWorker backend_lora_server:app
    # Or on Render: Set start command to the above

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 3001)),
        workers=1
    )
