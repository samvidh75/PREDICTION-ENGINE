# RouteLLM Server

## Build
```bash
docker build -t stockstory/routellm:latest .
```

## Run
```bash
docker run -d \
  --name routellm-server \
  -p 8000:8000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  stockstory/routellm:latest
```

## Test
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"router-mf-0.15","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'
```
