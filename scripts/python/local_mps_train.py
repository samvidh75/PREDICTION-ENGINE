#!/usr/bin/env python3
"""
local_mps_train.py — Fast LoRA fine-tuning for StockEX.
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
print("StockEX Fast Fine-Tuning")
print("=" * 60)

if not os.path.exists(DATASET_PATH):
    print(f"Dataset not found at {DATASET_PATH}")
    exit(1)

print(f"Dataset: {DATASET_PATH}")
print(f"Output:  {OUTPUT_DIR}")

gc.collect()

print("\nLoading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

print("Loading model (float32 on CPU)...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
    device_map="cpu",
    use_cache=False,
    low_cpu_mem_usage=True,
)

model.gradient_checkpointing_enable()

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

print("\nLoading dataset...")
dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
print(f"Dataset size: {len(dataset)} entries")

def format_chatml(example):
    if "messages" in example:
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text[:1024]}
    return example

dataset = dataset.map(format_chatml, num_proc=4)
print(f"Formatted: {dataset[0]['text'][:100]}...")

print("\nStarting training...")
sft_config = SFTConfig(
    output_dir=OUTPUT_DIR,
    max_length=512,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    dataloader_pin_memory=False,
    dataloader_num_workers=4,
    learning_rate=1e-4,
    num_train_epochs=3,
    warmup_ratio=0.1,
    weight_decay=0.01,
    save_strategy="epoch",
    logging_steps=10,
    fp16=False,
    bf16=False,
    report_to="none",
    save_total_limit=1,
    dataset_num_proc=4,
    dataset_text_field="text",
    shuffle_dataset=True,
    remove_unused_columns=True,
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

print("\nSaving adapter weights...")
trainer.model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

files = os.listdir(OUTPUT_DIR)
print(f"Files in {OUTPUT_DIR}: {files}")

config_path = os.path.join(OUTPUT_DIR, "adapter_config.json")
if os.path.exists(config_path):
    with open(config_path, "r") as f:
        meta = json.load(f)
    meta["model_type"] = "qwen2"
    with open(config_path, "w") as f:
        json.dump(meta, f, indent=2)
    print("adapter_config.json patched with model_type=qwen2")

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
