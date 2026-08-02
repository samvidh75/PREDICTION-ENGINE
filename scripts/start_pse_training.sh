#!/bin/bash

# PSE Gemma 2B Training Launcher
# Complete training pipeline with data generation and model fine-tuning

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     GEMMA 2B PSE STOCK ANALYSIS MODEL TRAINING LAUNCHER       ║"
echo "║                    Local Training Pipeline                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running from correct directory
if [ ! -f "scripts/gemma_pse_training.py" ]; then
    echo -e "${RED}❌ Error: Run this script from the project root directory${NC}"
    echo "Usage: bash scripts/start_pse_training.sh"
    exit 1
fi

# Step 1: Install dependencies
echo -e "\n${YELLOW}[STEP 1] Installing Python dependencies...${NC}"
if python3 -c "import torch; import transformers; import peft; import datasets; import accelerate" 2>/dev/null; then
    echo -e "${GREEN}✅ All dependencies already installed${NC}"
else
    echo -e "${YELLOW}📥 Installing missing packages...${NC}"
    pip install -q torch transformers peft datasets accelerate bitsandbytes
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Step 2: Generate PSE data
echo -e "\n${YELLOW}[STEP 2] Generating 30 years of PSE training data...${NC}"
if python3 scripts/pse_data_generator.py; then
    echo -e "${GREEN}✅ PSE data generated successfully${NC}"
    EXAMPLES=$(grep -c '"instruction"' pse_comprehensive_training.jsonl 2>/dev/null || echo "N/A")
    echo -e "${BLUE}   Total examples generated: $EXAMPLES${NC}"
else
    echo -e "${RED}❌ Failed to generate PSE data${NC}"
    exit 1
fi

# Step 3: Verify data format
echo -e "\n${YELLOW}[STEP 3] Verifying data format...${NC}"
if python3 << 'EOF'
import json
try:
    with open('pse_comprehensive_training.jsonl', 'r') as f:
        line = f.readline()
        data = json.loads(line)
        required_keys = {'instruction', 'input', 'output'}
        if required_keys.issubset(data.keys()):
            print("✅ Data format valid")
            exit(0)
        else:
            print("❌ Invalid data format")
            exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
EOF
then
    echo -e "${GREEN}✅ Data format verified${NC}"
else
    echo -e "${RED}❌ Data format validation failed${NC}"
    exit 1
fi

# Step 4: Check GPU availability
echo -e "\n${YELLOW}[STEP 4] Checking hardware...${NC}"
python3 << 'EOF'
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    print("✅ GPU detected - Training will be accelerated")
else:
    print("⚠️  No GPU detected - Training will use CPU (slower)")
EOF

# Step 5: Start training
echo -e "\n${YELLOW}[STEP 5] Starting Gemma 2B fine-tuning...${NC}"
echo -e "${BLUE}This may take several hours depending on your hardware${NC}"
echo -e "${BLUE}Training progress will be logged in: gemma_pse_training.log${NC}\n"

if python3 scripts/gemma_pse_training.py; then
    echo -e "\n${GREEN}✅ Training completed successfully!${NC}"

    # Step 6: Summary
    echo -e "\n${YELLOW}[STEP 6] Training Summary${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Model saved: ${BLUE}./gemma_pse_model_final${NC}"
    echo -e "Training log: ${BLUE}gemma_pse_training.log${NC}"
    echo -e "Output directory: ${BLUE}./gemma_pse_model${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "\n${YELLOW}[NEXT STEPS]${NC}"
    echo -e "1. Test the model with: ${BLUE}python3 scripts/test_gemma_pse.py${NC}"
    echo -e "2. Deploy to local service: ${BLUE}python3 scripts/run_gemma_api.py${NC}"
    echo -e "3. Integrate with frontend: ${BLUE}npm run dev${NC}"

    echo -e "\n${GREEN}🎉 PSE Gemma 2B model training complete!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Training failed${NC}"
    echo -e "${BLUE}Check ${RED}gemma_pse_training.log${BLUE} for details${NC}"
    exit 1
fi
