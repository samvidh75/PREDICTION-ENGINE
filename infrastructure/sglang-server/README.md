# SGLang Server

## Build
```bash
docker build -t stockstory/sglang:latest .
```

## Run (with GPU)
```bash
docker run -d \
  --name sglang-server \
  --gpus all \
  -p 30000:30000 \
  -v /models:/models \
  stockstory/sglang:latest
```

## Run (CPU fallback)
```bash
docker run -d \
  --name sglang-server \
  -p 30000:30000 \
  stockstory/sglang:latest \
  python3 -m sglang.launch_server --device cpu \
  --model-path meta-llama/Meta-Llama-3.1-8B-Instruct-GGUF \
  --port 30000
```

## Test
```bash
curl http://localhost:30000/health
```
