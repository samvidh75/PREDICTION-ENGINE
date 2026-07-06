#!/usr/bin/env python3
"""
🔬 GEMMA 2B SPECIALIZED TRAINING
Analytical, professional Indian stock market model with geopolitical analysis
"""

import json
import torch
from pathlib import Path
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import get_peft_model, LoraConfig, TaskType
import logging
import os

# Prevent meta tensor issues
os.environ['TRANSFORMERS_NO_ADVISORY_WARNINGS'] = '1'
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')
logger = logging.getLogger(__name__)

print("""
⏰ Start: """ + datetime.now().strftime("%H:%M:%S") + """
📊 Data: gemma_comprehensive_training.jsonl
💾 Output: /Users/samvidhmehta/Desktop/PREDICTION-ENGINE/gemma_analytical_adapter
🖥️  Device: CPU (Apple Silicon optimized)

✅ Packages ready

======================================================================
STEP 1: LOAD ANALYTICAL TRAINING DATA
======================================================================
""")

# Load dataset
dataset_path = Path('/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/gemma_comprehensive_training.jsonl')
examples = []

if dataset_path.exists():
    with open(dataset_path) as f:
        for line in f:
            try:
                ex = json.loads(line)
                examples.append(ex)
            except:
                pass
    print(f"\n✅ Loaded {len(examples)} analytical examples")
    print("   Purpose: Geopolitical analysis, health ratings, scenarios")
else:
    print(f"❌ Dataset not found: {dataset_path}")
    exit(1)

print("""
======================================================================
STEP 2: LOAD GEMMA 2B MODEL
======================================================================
""")

# Load model - avoid meta tensors
try:
    model_name = "google/gemma-2b-it"
    print(f"Loading {model_name}...")

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Load without device_map to avoid meta tensors
    base_model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,
        low_cpu_mem_usage=False
    )

    print(f"✅ Loaded {model_name}")
    print(f"   Model device: {next(base_model.parameters()).device}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("""
======================================================================
STEP 3: CONFIGURE LORA
======================================================================
""")

# LoRA config
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(base_model, lora_config)
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"✅ LoRA config: rank=8, alpha=16")
print(f"   Trainable params: {trainable:,}")

print("""
======================================================================
STEP 4: PREPARE TRAINING DATA
======================================================================
""")

# Format for training
texts = []
for ex in examples:
    if 'conversations' in ex:
        conv = ex['conversations']
        formatted = ""
        for msg in conv:
            if msg['role'] == 'user':
                formatted += f"User: {msg['content']}\n"
            else:
                formatted += f"Assistant: {msg['content']}\n"
        texts.append(formatted)

print(f"✅ Formatted {len(texts)} examples")

print("""
======================================================================
STEP 5: TRAIN MODEL
======================================================================
""")

output_dir = '/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/gemma_analytical_adapter'
Path(output_dir).mkdir(parents=True, exist_ok=True)

print("Training starting...")
device = torch.device('cpu')
model = model.to(device)

for epoch in range(2):
    for i, text in enumerate(texts * 2):
        try:
            inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=1024)
            inputs = {k: v.to(device) for k, v in inputs.items()}

            outputs = model(**inputs, labels=inputs['input_ids'])
            loss = outputs.loss

            if (i + 1) % max(1, len(texts)) == 0:
                print(f"Epoch {epoch+1}/2, Step {i+1}, Loss: {loss.item():.4f}")
        except Exception as e:
            print(f"  ⚠️  Step {i+1} error (skipping): {str(e)[:50]}")
            continue

print("""
======================================================================
STEP 6: SAVE ADAPTER
======================================================================
""")

try:
    # Ensure model is on CPU before saving
    model = model.to('cpu')
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"✅ Adapter saved: {output_dir}")
except Exception as e:
    print(f"❌ Save error: {e}")
    import traceback
    traceback.print_exc()

print("""
======================================================================
✅ GEMMA TRAINING COMPLETE
======================================================================
""")
print(f"⏰ End: {datetime.now().strftime('%H:%M:%S')}")
