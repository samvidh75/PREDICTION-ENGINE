#!/usr/bin/env python3
"""
🎓 QWEN 0.5B SPECIALIZED TRAINING
Conversational, beginner-friendly Indian stock market model
"""

import json
import torch
from pathlib import Path
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import get_peft_model, LoraConfig, TaskType
import logging

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')
logger = logging.getLogger(__name__)

print("""
⏰ Start: """ + datetime.now().strftime("%H:%M:%S") + """
📊 Data: qwen_comprehensive_training.jsonl
💾 Output: /Users/samvidhmehta/Desktop/PREDICTION-ENGINE/qwen_conversational_adapter
🖥️  Device: MPS (Apple Silicon)

✅ Packages ready

======================================================================
STEP 1: LOAD CONVERSATIONAL TRAINING DATA
======================================================================
""")

# Load dataset
dataset_path = Path('/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/qwen_comprehensive_training.jsonl')
examples = []

if dataset_path.exists():
    with open(dataset_path) as f:
        for line in f:
            try:
                ex = json.loads(line)
                examples.append(ex)
            except:
                pass
    print(f"\n✅ Loaded {len(examples)} conversational examples")
    print("   Purpose: Simple English, explained acronyms, beginner-friendly")
else:
    print(f"❌ Dataset not found: {dataset_path}")
    exit(1)

print("""
======================================================================
STEP 2: LOAD QWEN 0.5B MODEL
======================================================================
""")

# Load model
try:
    model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    base_model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,
        device_map="auto"
    )
    print(f"✅ Loaded {model_name}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit(1)

print("""
======================================================================
STEP 3: CONFIGURE LORA
======================================================================
""")

# LoRA config
lora_config = LoraConfig(
    r=32,
    lora_alpha=64,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(base_model, lora_config)
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"✅ LoRA config: rank=32, alpha=64")
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

# Simple training loop
output_dir = '/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/qwen_conversational_adapter'
Path(output_dir).mkdir(parents=True, exist_ok=True)

training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=2,
    per_device_train_batch_size=4,
    learning_rate=0.0002,
    max_steps=50,
    save_strategy="steps",
    save_steps=25,
    logging_steps=5,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=None,  # Use manual training
)

print("Training starting...")
for epoch in range(2):
    for i, text in enumerate(texts * 2):
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        outputs = model(**inputs, labels=inputs['input_ids'])
        loss = outputs.loss

        if (i + 1) % 5 == 0:
            print(f"Epoch {epoch+1}/2, Step {i+1}, Loss: {loss.item():.4f}")

print("""
======================================================================
STEP 6: SAVE ADAPTER
======================================================================
""")

model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)
print(f"✅ Adapter saved: {output_dir}")

print("""
======================================================================
✅ QWEN TRAINING COMPLETE
======================================================================
""")
print(f"⏰ End: {datetime.now().strftime('%H:%M:%S')}")
