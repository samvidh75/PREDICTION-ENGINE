#!/usr/bin/env python3
"""
Fine-tune Qwen2.5-1B-Instruct on 57K Indian stock market analysis examples.
Uses LoRA for memory-efficient training on MPS (Apple Silicon).

Usage:
    python3 scripts/python/finetune_qwen_1b.py
"""

import os
import torch
import json
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTConfig, SFTTrainer

MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
DATASET_PATH = "qwen_1b_training.jsonl"
OUTPUT_DIR = "./stockex_qwen_1b_output"


def execute_finetune():
    print("Initializing Qwen 1.5B Fine-Tuning Pipeline...")
    print(f"Model: {MODEL_ID}")
    print(f"Dataset: {DATASET_PATH}")
    print(f"MPS Available: {torch.backends.mps.is_available()}")

    if not os.path.exists(DATASET_PATH):
        print(f"Dataset not found at: {DATASET_PATH}")
        return

    # Load dataset
    dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
    print(f"Loaded {len(dataset)} training examples")

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Load model with mixed precision for MPS
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16,
        device_map=None,
        trust_remote_code=True,
    )

    # Move to MPS
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = model.to(device)
    print(f"Model loaded on {device}")

    # LoRA config
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Training config
    sft_config = SFTConfig(
        output_dir=OUTPUT_DIR,
        max_length=1024,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        learning_rate=1e-5,
        num_train_epochs=3,
        save_strategy="epoch",
        fp16=True,
        logging_steps=10,
        report_to="none",
        save_total_limit=3,
        dataloader_pin_memory=False,
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        args=sft_config,
        processing_class=tokenizer,
    )

    print("Starting training...")
    trainer.train()

    # Save final model
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Training complete! Model saved to: {OUTPUT_DIR}")

    # Patch adapter config for compatibility
    config_path = os.path.join(OUTPUT_DIR, "adapter_config.json")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            meta = json.load(f)
        meta["model_type"] = "qwen2"
        with open(config_path, "w") as f:
            json.dump(meta, f, indent=2)
        print("adapter_config.json patched for Qwen compatibility")


if __name__ == "__main__":
    execute_finetune()
