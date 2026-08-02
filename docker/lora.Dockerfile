# ─────────────────────────────────────────────────────────────────────────────
# StockEX Philippines — LoRA Inference Server Dockerfile
# Runs the fine-tuned Qwen2.5-0.5B-Instruct LoRA adapter on a FastAPI
# server for real-time PSE stock analysis.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.10-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    torch>=2.0.0 \
    transformers>=4.35.0 \
    peft>=0.6.0 \
    fastapi>=0.100.0 \
    uvicorn>=0.23.0 \
    pydantic>=2.0.0 \
    numpy \
    pandas \
    httpx

# Copy adapter files
COPY stockex_slm_agent_output /app/stockex_slm_agent_output

# Copy the Python LoRA server code
COPY src/pse_ai_engine /app/pse_ai_engine

# Expose API port
EXPOSE 3001

# Start the inference server
CMD ["uvicorn", "pse_ai_engine.server:app", "--host", "0.0.0.0", "--port", "3001"]