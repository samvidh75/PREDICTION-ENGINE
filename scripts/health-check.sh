#!/bin/bash

echo "Health Check — $(date)"

ERRORS=0

# Ollama
OLLAMA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/tags 2>/dev/null || echo "000")
if [ "$OLLAMA_STATUS" = "200" ]; then
  echo "  Ollama:          OK (port 11434)"
else
  echo "  Ollama:          DOWN (HTTP $OLLAMA_STATUS)"
  ERRORS=$((ERRORS + 1))
fi

# Backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/intelligence/ai-health 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
  echo "  Backend:         OK (port 4001)"
else
  echo "  Backend:         DOWN (HTTP $BACKEND_STATUS)"
  ERRORS=$((ERRORS + 1))
fi

# AI Intelligence
INTEL=$(curl -s http://localhost:4001/api/intelligence/ai-health 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','down'))" 2>/dev/null || echo "down")
if [ "$INTEL" = "healthy" ]; then
  echo "  Intelligence:    OK"
else
  echo "  Intelligence:    DOWN"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "All systems operational"
  exit 0
else
  echo "$ERRORS service(s) down"
  exit 1
fi
