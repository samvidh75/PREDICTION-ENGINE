#!/usr/bin/env python3
"""
colab_train_stockex.ipynb.py — Google Colab Notebook Script
============================================================
Run this in Google Colab: Runtime → Run all

Trains Qwen2.5-0.5B-Instruct LoRA adapter on StockEX Encyclopedia dataset.
Output: stockex_slm_agent_output/  (downloads automatically as zip)

Prerequisites:
  - Upload stockex_encyclopedia_dataset.jsonl to Colab's file system
    or mount Google Drive containing it
"""

# ──────────────────────────────────────────────
# 0. Install dependencies (run once per session)
# ──────────────────────────────────────────────
import subprocess, sys, os, json, zipfile, glob

subprocess.check_call([
    sys.executable, "-m", "pip", "install",
    "torch", "transformers", "datasets", "trl",
    "peft", "accelerate", "bitsandbytes",
    "-q",
])

# ──────────────────────────────────────────────
# 1. Imports
# ──────────────────────────────────────────────
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from trl import SFTConfig, SFTTrainer

print("=" * 60)
print("StockEX Encyclopedia Fine-Tuning")
print("=" * 60)

# ──────────────────────────────────────────────
# 2. Locate dataset
# ──────────────────────────────────────────────
DATASET_PATH = "stockex_encyclopedia_dataset.jsonl"
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
OUTPUT_DIR = "./stockex_slm_agent_output"

# Try mounting Google Drive if dataset not found locally
if not os.path.exists(DATASET_PATH):
    print("Dataset not found locally. Attempting Google Drive mount...")
    from google.colab import drive
    drive.mount("/content/drive")
    # Search common paths
    for p in [
        "/content/drive/MyDrive/stockex_encyclopedia_dataset.jsonl",
        "/content/drive/MyDrive/PREDICTION-ENGINE/stockex_encyclopedia_dataset.jsonl",
        "/content/drive/MyDrive/data/stockex_encyclopedia_dataset.jsonl",
    ]:
        if os.path.exists(p):
            DATASET_PATH = p
            print(f"Found dataset at {DATASET_PATH}")
            break
    else:
        # Last resort: upload dialog
        from google.colab import files
        print("Please upload stockex_encyclopedia_dataset.jsonl")
        uploaded = files.upload()
        DATASET_PATH = list(uploaded.keys())[0]

print(f"Using dataset: {DATASET_PATH}")
print(f"Output directory: {OUTPUT_DIR}")

# ──────────────────────────────────────────────
# 3. Load tokenizer and model
# ──────────────────────────────────────────────
print("\nLoading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

print("Loading model (4-bit quantized)...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    device_map="auto",
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
)

# ──────────────────────────────────────────────
# 4. Configure LoRA
# ──────────────────────────────────────────────
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

# ──────────────────────────────────────────────
# 5. Load dataset
# ──────────────────────────────────────────────
print("\nLoading dataset...")
dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
print(f"Dataset size: {len(dataset)} entries")

# Show a sample
sample = dataset[0]
print(f"Sample entry keys: {list(sample.keys())}")
if "messages" in sample:
    print(f"  Roles: {[m['role'] for m in sample['messages']]}")

# The dataset uses ChatML format with "messages" column.
# SFTTrainer can handle it directly if we pass the right formatting.

def format_chatml(example):
    """Convert ChatML messages to text string."""
    if "messages" in example:
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}
    return example

dataset = dataset.map(format_chatml)

# ──────────────────────────────────────────────
# 6. Train
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("Starting training...")
print("=" * 60)

total_steps = max(1, len(dataset) // 16 * 3)  # ~3 epochs at batch 16 effective

sft_config = SFTConfig(
    output_dir=OUTPUT_DIR,
    max_seq_length=1024,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=3,
    save_strategy="epoch",
    logging_steps=10,
    fp16=True,
    report_to="none",
    save_total_limit=2,
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=sft_config,
    tokenizer=tokenizer,
    dataset_text_field="text",
    max_seq_length=1024,
)

trainer.train()

# ──────────────────────────────────────────────
# 7. Save adapter
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("Saving adapter weights...")
print("=" * 60)

trainer.model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"Adapter saved to {OUTPUT_DIR}")
print(f"Files: {os.listdir(OUTPUT_DIR)}")

# Patch adapter_config.json for qwen2 compatibility
config_path = os.path.join(OUTPUT_DIR, "adapter_config.json")
if os.path.exists(config_path):
    with open(config_path, "r") as f:
        meta = json.load(f)
    meta["model_type"] = "qwen2"
    with open(config_path, "w") as f:
        json.dump(meta, f, indent=2)
    print("adapter_config.json patched with model_type=qwen2")

# ──────────────────────────────────────────────
# 8. Zip and download
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("Packaging for download...")
print("=" * 60)

zip_path = "/content/stockex_slm_agent_output.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for fpath in glob.glob(os.path.join(OUTPUT_DIR, "**", "*"), recursive=True):
        if os.path.isfile(fpath):
            zf.write(fpath, os.path.relpath(fpath, OUTPUT_DIR))

print(f"Created: {zip_path}")
print(f"Size: {os.path.getsize(zip_path) / 1024 / 1024:.1f} MB")

from google.colab import files
files.download(zip_path)

print("\n" + "=" * 60)
print("DONE. Zip downloaded to your machine.")
print("=" * 60)
print()
print("Next steps on your local machine:")
print(f"  1. Extract zip into {OUTPUT_DIR}/")
print(f"  2. Verify with: ls -la {OUTPUT_DIR}/")
print(f"  3. Deploy via: cron/cloudflare_tune.sh")
print(f"  4. Or test locally with Modelfile")
