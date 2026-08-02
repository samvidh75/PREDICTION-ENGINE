#!/bin/bash
set -e

echo "Installing StockStory systemd services..."

SERVICES_DIR="$(dirname "$0")"
PROJECT_DIR="$(cd "$SERVICES_DIR/../.." && pwd)"

# Install Ollama (if not present)
if ! command -v ollama &> /dev/null; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.ai/install.sh | sh
fi

# Pull base model for StockEX
echo "Pulling Qwen2.5-0.5B-Instruct base model..."
ollama pull qwen2.5:0.5b-instruct

# Create StockEX fine-tuned model from adapter
if [ -f "$PROJECT_DIR/Modelfile" ] && [ -d "$PROJECT_DIR/stockex_slm_agent_output" ]; then
  echo "Creating StockEX model from LoRA adapter..."
  cd "$PROJECT_DIR"
  ollama create stockex -f Modelfile
else
  echo "LoRA adapter not found, skipping StockEX model creation"
  echo "Pull base model only:"
  ollama pull mistral:latest
fi

# Copy service files
sudo cp "$SERVICES_DIR/stockstory-ollama.service" /etc/systemd/system/
sudo cp "$SERVICES_DIR/stockstory-backend.service" /etc/systemd/system/
sudo cp "$SERVICES_DIR/stockstory-lora-server.service" /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable stockstory-ollama
sudo systemctl enable stockstory-lora-server
sudo systemctl enable stockstory-backend
sudo systemctl start stockstory-ollama
echo "Waiting for Ollama to be ready..."
sleep 10
sudo systemctl start stockstory-lora-server
echo "Waiting for LoRA server to load model..."
sleep 15
sudo systemctl start stockstory-backend

echo "Done. Check status with:"
echo "  sudo systemctl status stockstory-ollama"
echo "  sudo systemctl status stockstory-lora-server"
echo "  sudo systemctl status stockstory-backend"
