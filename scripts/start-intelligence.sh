#!/bin/bash

echo "Starting StockStory Intelligence Stack..."

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Ollama is running
echo -e "${BLUE}Checking Ollama...${NC}"
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "Starting Ollama..."
  ollama serve &
  sleep 5
fi

# Check if model is downloaded
echo -e "${BLUE}Checking Mistral model...${NC}"
if ! ollama list 2>/dev/null | grep -q mistral; then
  echo "Downloading Mistral model (this may take a few minutes)..."
  ollama pull mistral:latest
fi

# Start SGLang server with Ollama backend
echo -e "${BLUE}Starting SGLang server...${NC}"
if command -v sglang &> /dev/null; then
  sglang start-server --model-path ollama/mistral --port 8000 --host 0.0.0.0 &
else
  echo "Installing SGLang..."
  pip3 install sglang vllm torch --quiet 2>/dev/null || true
  sglang start-server --model-path ollama/mistral --port 8000 --host 0.0.0.0 &
fi

# Wait for SGLang to be ready
echo "Waiting for SGLang to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}SGLang is ready!${NC}"
    break
  fi
  sleep 2
done

echo -e "${GREEN}All services started!${NC}"
echo "SGLang:   http://localhost:8000"
echo "Ollama:   http://localhost:11434"

# Keep script running
wait
