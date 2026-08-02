#!/bin/bash
# SGLang Performance Benchmark Suite
# Usage: ./scripts/benchmark-llm.sh [url]
# Default: http://localhost:30000

SGLANG_URL="${1:-http://localhost:30000}"
RESULTS_FILE="benchmarks/results-$(date +%Y%m%d-%H%M%S).json"

echo "SGLang Benchmark Suite"
echo "Target: $SGLANG_URL"
echo "Results: $RESULTS_FILE"
echo ""

benchmark() {
  local name="$1"
  local payload="$2"
  local runs="${3:-3}"

  echo "Benchmark: $name"
  echo "  Runs: $runs"

  local total_ms=0
  local min_ms=999999
  local max_ms=0
  local successes=0

  for i in $(seq 1 $runs); do
    local start=$(date +%s%N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      "$SGLANG_URL/generate" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      --max-time 60)
    local end=$(date +%s%N)
    local ms=$(( (end - start) / 1000000 ))

    if [ "$response" = "200" ]; then
      successes=$((successes + 1))
    fi

    total_ms=$((total_ms + ms))
    [ $ms -lt $min_ms ] && min_ms=$ms
    [ $ms -gt $max_ms ] && max_ms=$ms

    echo "    Run $i: ${ms}ms (HTTP $response)"
  done

  local avg=$(( total_ms / runs ))
  echo "  Avg: ${avg}ms | Min: ${min_ms}ms | Max: ${max_ms}ms | Success: ${successes}/${runs}"
  echo ""
}

echo "==========================================="
echo " 1. Simple Generation"
echo "==========================================="
benchmark "simple" '{
  "text": "What is PE ratio?",
  "sampling_params": {"max_new_tokens": 50, "temperature": 0.3}
}'

echo "==========================================="
echo " 2. Structured JSON Generation"
echo "==========================================="
benchmark "structured" '{
  "text": "Analyze TCS stock quality",
  "sampling_params": {"max_new_tokens": 100, "temperature": 0.3},
  "json_schema": {
    "type": "object",
    "properties": {
      "analysis": {"type": "string"},
      "score": {"type": "number"}
    }
  }
}'

echo "==========================================="
echo " 3. Thesis Generation (longer output)"
echo "==========================================="
benchmark "thesis" '{
  "text": "Generate investment thesis for HDFCBANK with PE=18, ROE=15%, Growth=12%",
  "sampling_params": {"max_new_tokens": 200, "temperature": 0.3}
}'

echo "==========================================="
echo " 4. Health Check"
echo "==========================================="
local start=$(date +%s%N)
local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$SGLANG_URL/health" --max-time 5)
local end=$(date +%s%N)
local ms=$(( (end - start) / 1000000 ))
echo "  HTTP $http_code in ${ms}ms"

echo ""
echo "==========================================="
echo " Results saved to $RESULTS_FILE"
echo "==========================================="

cat > "$RESULTS_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "$SGLANG_URL",
  "results": [
    {
      "name": "simple",
      "avgMs": $avg_simple,
      "success": true
    }
  ]
}
EOF

echo "Done."
