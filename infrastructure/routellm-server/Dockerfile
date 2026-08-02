FROM python:3.11-slim

WORKDIR /app

RUN pip install "routellm[serve,eval]" torch transformers fastapi uvicorn

COPY config.yaml /app/config.yaml

EXPOSE 8000

CMD ["python", "-m", "routellm.openai_server", \
     "--routers", "mf", \
     "--strong-model", "gpt-4o", \
     "--weak-model", "ollama_chat/llama3", \
     "--config", "/app/config.yaml", \
     "--host", "0.0.0.0", \
     "--port", "8000"]
