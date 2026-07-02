#!/usr/bin/env python3
"""
cloud_train.py — Production LoRA Fine-Tuning for StockEX.
Trains Qwen2.5-0.5B on stockex_encyclopedia_dataset.jsonl and patches
adapter_config.json for Cloudflare compatibility.

Usage:
    python3 scripts/python/cloud_train.py
"""

import os
import torch
import json
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from trl import SFTConfig, SFTTrainer

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
DATASET_PATH = "stockex_encyclopedia_dataset.jsonl"
OUTPUT_DIR = "./stockex_slm_agent_output"


def execute_production_finetune():
    print("Initializing Production StockEX Fine-Tuning Pipeline...")

    if not os.path.exists(DATASET_PATH):
        print(f"Dataset missing at: {DATASET_PATH}")
        print("Run 'python3 scripts/python/compile_encyclopedia.py' first.")
        return

    dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16,
        device_map="auto",
    )

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)

    sft_config = SFTConfig(
        output_dir=OUTPUT_DIR,
        max_length=512,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        num_train_epochs=1,
        save_strategy="epoch",
        fp16=True,
        logging_steps=10,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        args=sft_config,
    )

    print("Running parameter optimizations...")
    trainer.train()

    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Training finished! Saved inside: {OUTPUT_DIR}")

    config_path = os.path.join(OUTPUT_DIR, "adapter_config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        meta["model_type"] = "qwen2"

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        print("adapter_config.json patched.")


if __name__ == "__main__":
    execute_production_finetune()
