#!/usr/bin/env python3
"""
local_mps_train.py — Run LoRA fine-tuning on Apple Silicon (MPS).
Usage: python3 scripts/python/local_mps_train.py
"""

import os, json, zipfile, glob, gc, time
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from trl import SFTConfig, SFTTrainer

DATASET_PATH = "stockex_encyclopedia_dataset.jsonl"
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
OUTPUT_DIR = "./stockex_slm_agent_output"

print("=" * 60)
print("StockEX Local MPS Fine-Tuning")
print("=" * 60)

# Check dataset
if not os.path.exists(DATASET_PATH):
    print(f"Dataset not found at {DATASET_PATH}")
    exit(1)

print(f"Dataset: {DATASET_PATH}")
print(f"Output:  {OUTPUT_DIR}")

# Memory cleanup
gc.collect()
if hasattr(torch.mps, 'empty_cache'):
    torch.mps.empty_cache()

# Load tokenizer
print("\nLoading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

# Load model in float16 on MPS
print("Loading model (float16 on MPS)...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    device_map="mps",
    use_cache=False,  # Disable KV cache to save memory
)

# Enable gradient checkpointing to save memory
model.gradient_checkpointing_enable()

# LoRA config
print("\nConfiguring LoRA...")
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# Load dataset
print("\nLoading dataset...")
dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
print(f"Dataset size: {len(dataset)} entries")

# Print sample
sample = dataset[0]
print(f"Sample keys: {list(sample.keys())}")

# Format ChatML messages to text
def format_chatml(example):
    if "messages" in example:
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}
    return example

dataset = dataset.map(format_chatml)
print(f"Formatted example:\n  {dataset[0]['text'][:200]}...")

# Training config
print("\nStarting training...")
sft_config = SFTConfig(
    output_dir=OUTPUT_DIR,
    max_length=512,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=3,
    save_strategy="epoch",
    logging_steps=5,
    fp16=True,
    report_to="none",
    save_total_limit=2,
    dataset_num_proc=0,
    dataset_text_field="text",
    shuffle_dataset=True,
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=sft_config,
    processing_class=tokenizer,
)

start = time.time()
trainer.train()
elapsed = time.time() - start
print(f"\nTraining completed in {elapsed/60:.1f} minutes")

# Save adapter
print("\nSaving adapter weights...")
trainer.model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

files = os.listdir(OUTPUT_DIR)
print(f"Files in {OUTPUT_DIR}: {files}")

# Patch adapter_config.json
config_path = os.path.join(OUTPUT_DIR, "adapter_config.json")
if os.path.exists(config_path):
    with open(config_path, "r") as f:
        meta = json.load(f)
    meta["model_type"] = "qwen2"
    with open(config_path, "w") as f:
        json.dump(meta, f, indent=2)
    print("adapter_config.json patched with model_type=qwen2")

# Zip
zip_path = "/tmp/stockex_slm_agent_output.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for fpath in glob.glob(os.path.join(OUTPUT_DIR, "**", "*"), recursive=True):
        if os.path.isfile(fpath):
            zf.write(fpath, os.path.relpath(fpath, OUTPUT_DIR))

print(f"\nCreated: {zip_path}")
print(f"Size: {os.path.getsize(zip_path) / 1024 / 1024:.1f} MB")
print(f"\nAdapter ready at: {OUTPUT_DIR}/")
print("=" * 60)
print("DONE")
