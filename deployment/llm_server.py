"""
StockEX Philippines — LLM Inference Server for VPS deployment
Serves the fine-tuned Qwen2.5-0.5B model via FastAPI with LoRA adapters.
Designed for Webyne VPS (4 CPU, 8GB RAM).
"""

import os
import json
import time
import logging
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockex-llm")

app = FastAPI(title="StockEX LLM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "/opt/stockex/stockex_slm_agent_output")
ADAPTER_PATH = os.getenv("ADAPTER_PATH", "/opt/stockex/gemma_pse_model_final")

model = None
tokenizer = None
device = "cpu"

class Query(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.3
    top_p: float = 0.9
    stream: bool = False

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    uptime: float

START_TIME = time.time()

@app.on_event("startup")
async def load_model():
    global model, tokenizer, device
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading model on {device}...")

        model_id = "Qwen/Qwen2.5-0.5B-Instruct"

        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)

        if os.path.exists(ADAPTER_PATH):
            from peft import PeftModel
            base = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float32,
                device_map="auto",
                trust_remote_code=True,
            )
            model = PeftModel.from_pretrained(base, ADAPTER_PATH)
            logger.info(f"LoRA adapter loaded from {ADAPTER_PATH}")
        else:
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float32,
                device_map="auto",
                trust_remote_code=True,
            )
            logger.info("Base model loaded (no adapter found)")

        model.eval()
        logger.info(f"Model loaded successfully on {device}")
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        model = None

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if model is not None else "degraded",
        model_loaded=model is not None,
        device=device,
        uptime=time.time() - START_TIME,
    )

@app.post("/v1/chat/completions")
async def chat_completions(query: Query):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    messages = [{"role": "user", "content": query.prompt}]

    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_new_tokens=query.max_tokens,
            temperature=query.temperature,
            top_p=query.top_p,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    response = tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "stockex-pse-slm",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": response},
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": inputs.shape[1],
            "completion_tokens": outputs.shape[1] - inputs.shape[1],
            "total_tokens": outputs.shape[1],
        },
    }

@app.post("/v1/embeddings")
async def embeddings(text: str):
    return {"error": "Embeddings not yet supported"}, 501

if __name__ == "__main__":
    port = int(os.getenv("LLM_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, workers=1)
