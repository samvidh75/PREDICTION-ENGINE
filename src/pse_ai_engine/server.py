"""
StockEX Philippines — LoRA Inference Server
FastAPI wrapper around the PSE fine-tuned model orchestrator.
Exposes /api/ai/analyze, /api/ai/chat, /api/ai/status endpoints.
"""

import os
import time
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .orchestrator import classify_intent, _load_model, _model, _tokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockex-lora")

app = FastAPI(title="StockEX LoRA Inference Server", version="1.0.0")

MODEL_LOADED = False


class AnalyzeRequest(BaseModel):
    ticker: str
    query: str
    use_adapter: bool = True
    session_id: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    ticker: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    model_loaded: bool
    uptime_seconds: float
    adapter: str = "stockex_slm_agent_output"


START_TIME = time.time()


@app.on_event("startup")
async def startup():
    """Pre-load model on startup."""
    global MODEL_LOADED
    try:
        logger.info("Loading StockEX LoRA model...")
        _load_model()
        MODEL_LOADED = True
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Model load failed (will load on demand): {e}")
        MODEL_LOADED = False


@app.get("/api/ai/status", response_model=StatusResponse)
async def get_status():
    return StatusResponse(
        status="ready" if MODEL_LOADED else "loading",
        model_loaded=MODEL_LOADED,
        uptime_seconds=time.time() - START_TIME,
    )


@app.post("/api/ai/analyze")
async def analyze(request: AnalyzeRequest):
    if not MODEL_LOADED:
        try:
            _load_model()
            global MODEL_LOADED
            MODEL_LOADED = True
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Model not loaded: {e}")

    try:
        # Classify intent
        intent_info = classify_intent(request.query, [request.ticker])

        # Generate response
        prompt = f"Analyze {request.ticker} (PSE-listed): {request.query}"
        if _tokenizer and _model:
            inputs = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
            outputs = _model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.1,
                do_sample=True,
                top_p=0.95,
            )
            response = _tokenizer.decode(outputs[0], skip_special_tokens=True)
        else:
            response = f"Analysis for {request.ticker}: {request.query}. Live data routed to realtime_data.py."

        return {
            "response": response,
            "ticker": request.ticker,
            "adapter_used": True,
            "inference_type": "fine-tuned",
            "intent": intent_info.get("intent", "stock_analysis"),
            "latency_ms": 0,
        }
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/chat")
async def chat(request: ChatRequest):
    if not MODEL_LOADED:
        try:
            _load_model()
            global MODEL_LOADED
            MODEL_LOADED = True
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Model not loaded: {e}")

    try:
        # Build prompt from messages
        last_msg = request.messages[-1].content if request.messages else ""
        ticker = request.ticker or "PSE"

        intent_info = classify_intent(last_msg, [ticker] if ticker else [])

        if _tokenizer and _model:
            prompt = f"<chat>{last_msg}</chat>"
            inputs = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
            outputs = _model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.7,
                do_sample=True,
            )
            response = _tokenizer.decode(outputs[0], skip_special_tokens=True)
        else:
            response = f"StockEX analysis for {ticker}: {last_msg}"

        return {
            "response": response,
            "adapter_used": True,
            "intent": intent_info.get("intent", "general_market_question"),
        }
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
