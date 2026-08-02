#!/bin/bash
# Post-deployment smoke test

DOMAIN="https://www.stockstory-india.com"
BACKEND="https://api.stockstory-india.com"

echo "Post-Deployment Smoke Tests"
echo ""

echo "1) Health check..."
curl -s "${BACKEND}/api/health" | grep -q '"status":"ok"' && echo "Backend healthy" || echo "Backend down"

echo "2) Search TCS..."
curl -s "${BACKEND}/api/search/universal?query=TCS" | grep -q "TCS" && echo "Search works" || echo "Search failed"

echo "3) Fetch snapshot for TCS..."
curl -s "${BACKEND}/api/research/snapshot/TCS" | grep -q "quality_score" && echo "Snapshot works" || echo "Snapshot failed"

echo "4) Run scanner..."
curl -s "${BACKEND}/api/research/scanner?preset=Quality%20Compounders&limit=5" | grep -q "results" && echo "Scanner works" || echo "Scanner failed"

echo "5) Fetch RAG context..."
curl -s "${BACKEND}/api/research/rag-context/RELIANCE" | grep -q "metrics" && echo "RAG works" || echo "RAG failed"

echo "6) Frontend loads..."
curl -s "${DOMAIN}" | grep -q "stockstory\|research\|scanner" && echo "Frontend loads" || echo "Frontend failed"

echo ""
echo "Smoke tests complete!"
