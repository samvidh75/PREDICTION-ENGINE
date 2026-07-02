#!/usr/bin/env python3
"""
cloud_train.py — Native Qwen2.5-0.5B-Instruct LoRA Fine-Tuning (TRL 1.7.0).
Trains on the encyclopedia dataset and patches adapter_config.json
for Cloudflare Workers AI compatibility (model_type: "qwen2").

Usage:
    python3 scripts/python/cloud_train.py
"""

import os
import torch
import json
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
DATASET_PATH = "stockex_encyclopedia_dataset.jsonl"
OUTPUT_DIR = "./stockex_slm_agent_output"


def execute_qwen_cloud_finetune():
    print("Initializing Qwen2.5-0.5B-Instruct Cloud Fine-Tuning Pipeline...")

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

    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        num_train_epochs=3,
        save_strategy="epoch",
        fp16=True,
        logging_steps=10,
        report_to="none",
        max_length=512,
        packing=False,
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        processing_class=tokenizer,
    )

    print("Running parameter convergence matrix calculations across GPU channels...")
    trainer.train()

    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Fine-tuning completed! Model weights compiled inside: {OUTPUT_DIR}")

    config_path = os.path.join(OUTPUT_DIR, "adapter_config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config_meta = json.load(f)

        config_meta["model_type"] = "qwen2"

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_meta, f, indent=2)
        print("adapter_config.json patched with model_type: 'qwen2'.")


if __name__ == "__main__":
    execute_qwen_cloud_finetune()