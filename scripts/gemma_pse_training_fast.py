#!/usr/bin/env python3
"""
Fast Gemma 2B PSE Training - CPU Optimized
Skips bitsandbytes, uses minimal memory footprint
"""

import torch
import json
import logging
import sys
import time
import os
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler('gemma_pse_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    logger.info("="*80)
    logger.info("🚀 GEMMA 2B PSE FINE-TUNING (FAST CPU MODE)")
    logger.info("="*80)
    logger.info(f"Device: {'CUDA (GPU)' if torch.cuda.is_available() else 'CPU'}")
    logger.info(f"Python: {sys.version}")
    logger.info(f"PyTorch: {torch.__version__}")

    # Step 1: Load data
    logger.info("\n📂 Loading PSE training data...")
    data_file = 'pse_comprehensive_training.jsonl'

    if not os.path.exists(data_file):
        logger.error(f"❌ {data_file} not found!")
        logger.info("Run: python3 scripts/pse_data_generator.py first")
        return False

    try:
        with open(data_file, 'r') as f:
            training_data = [json.loads(line) for line in f if line.strip()]
        logger.info(f"✅ Loaded {len(training_data)} training examples")
    except Exception as e:
        logger.error(f"❌ Error loading data: {e}")
        return False

    # Step 2: Import transformers
    logger.info("\n📥 Importing transformers...")
    try:
        from transformers import (
            AutoTokenizer,
            AutoModelForCausalLM,
            TrainingArguments,
            Trainer,
            DataCollatorForLanguageModeling,
        )
        from datasets import Dataset
        from peft import LoraConfig, get_peft_model, TaskType
        logger.info("✅ All imports successful")
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        return False

    # Step 3: Prepare dataset
    logger.info("\n🔧 Preparing dataset...")
    formatted_data = []
    for example in training_data:
        formatted_data.append({
            'text': f"<|im_start|>system\nYou are an expert financial analyst specializing in Philippine Stock Exchange stocks.\n<|im_end|>\n<|im_start|>user\n{example['instruction']}\n{example['input']}\n<|im_end|>\n<|im_start|>assistant\n{example['output']}\n<|im_end|>"
        })

    dataset = Dataset.from_dict({'text': [d['text'] for d in formatted_data]})
    logger.info(f"✅ Dataset prepared: {len(dataset)} examples")

    # Step 4: Load model and tokenizer
    logger.info("\n📥 Loading Gemma 2B model...")
    model_name = "google/gemma-2b-it"

    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.pad_token = tokenizer.eos_token

        # Load in 32-bit on CPU
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float32,
            device_map="cpu" if not torch.cuda.is_available() else "auto",
        )
        logger.info("✅ Model loaded successfully")
    except Exception as e:
        logger.error(f"❌ Model loading failed: {e}")
        return False

    # Step 5: Setup LoRA
    logger.info("\n⚙️  Configuring LoRA...")
    lora_config = LoraConfig(
        r=8,  # Reduced from 16 for faster training
        lora_alpha=16,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    model = get_peft_model(model, lora_config)
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    logger.info(f"✅ LoRA configured")
    logger.info(f"   Trainable: {trainable_params:,} / {total_params:,} ({100*trainable_params/total_params:.1f}%)")

    # Step 6: Tokenize
    logger.info("\n🔄 Tokenizing dataset...")
    def tokenize_function(examples):
        outputs = tokenizer(
            examples['text'],
            truncation=True,
            max_length=512,
            padding='max_length',
        )
        outputs['labels'] = outputs['input_ids'].copy()
        return outputs

    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        num_proc=1,  # Single process on CPU
        remove_columns=['text'],
    )
    logger.info(f"✅ Tokenization complete")

    # Step 7: Training
    logger.info("\n" + "="*80)
    logger.info("📈 TRAINING STARTING")
    logger.info("="*80)

    training_args = TrainingArguments(
        output_dir="./gemma_pse_model",
        num_train_epochs=1,  # Reduced from 3 for faster training
        per_device_train_batch_size=1,  # Minimal batch size for CPU
        gradient_accumulation_steps=4,
        warmup_steps=50,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=5,
        save_steps=50,
        save_total_limit=2,
        learning_rate=2e-4,
        fp16=False,  # Use 32-bit on CPU
        seed=42,
        report_to="none",
    )

    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    start_time = time.time()
    try:
        trainer.train()
        elapsed = time.time() - start_time
        logger.info("\n" + "="*80)
        logger.info("✅ TRAINING COMPLETE!")
        logger.info("="*80)
        logger.info(f"⏱️  Training time: {elapsed/3600:.2f} hours")

        # Save model
        logger.info("\n💾 Saving model...")
        model.save_pretrained("./gemma_pse_model_final")
        tokenizer.save_pretrained("./gemma_pse_model_final")
        logger.info("✅ Model saved to: ./gemma_pse_model_final")

        return True
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
