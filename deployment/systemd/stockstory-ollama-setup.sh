#!/bin/bash
set -e

echo "Installing StockStory systemd services..."

SERVICES_DIR="$(dirname "$0")"

# Install Ollama (if not present)
if ! command -v ollama &> /dev/null; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.ai/install.sh | sh
fi

# Pull model
ollama pull mistral:latest

# Copy service files
sudo cp "$SERVICES_DIR/stockstory-ollama.service" /etc/systemd/system/
sudo cp "$SERVICES_DIR/stockstory-backend.service" /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable stockstory-ollama
sudo systemctl enable stockstory-backend
sudo systemctl start stockstory-ollama
echo "Waiting for Ollama to be ready..."
sleep 10
sudo systemctl start stockstory-backend

echo "Done. Check status with:"
echo "  sudo systemctl status stockstory-ollama"
echo "  sudo systemctl status stockstory-backend"
