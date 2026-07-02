#!/usr/bin/env python3
"""
cloud_train.py — CodeEX Cloud LoRA Fine-Tuning via PEFT + SFTTrainer.

Run this file on a cloud GPU instance (AWS P4/P5, Lambda Labs) to fine-tune
Qwen2.5-0.5B-Instruct with LoRA on the agentic tool-calling dataset.

Usage:
    pip install torch transformers datasets trl peft accelerate
    python3 scripts/python/cloud_train.py
"""

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
DATASET_PATH = "cloud_agent_dataset.jsonl"
OUTPUT_DIR = "./stockex_slm_agent_output"


def run_cloud_agent_tuning():
    print("Starting Cloud Fine-Tuning Loop using PEFT/LoRA...")

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
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        num_train_epochs=3,
        save_strategy="epoch",
        fp16=True,
        logging_steps=10,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        args=training_args,
        peft_config=lora_config,
        max_seq_length=512,
        dataset_text_field="text",
    )

    print("Training model parameter weights across cloud GPU rings...")
    trainer.train()

    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Fine-tuning finished! Model weights saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    run_cloud_agent_tuning()
