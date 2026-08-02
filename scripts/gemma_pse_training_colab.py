#!/usr/bin/env python3
"""Gemma 2B PSE Training - Colab GPU Optimized with 8-bit Quantization"""

import torch
import json
import logging
import os
from datetime import datetime
from huggingface_hub import login

# Set memory optimization
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

login(token=os.environ.get("HF_TOKEN", ""))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
)
logger = logging.getLogger(__name__)

def main():
    logger.info("="*80)
    logger.info("🚀 GEMMA 2B PSE FINE-TUNING (COLAB - 8-BIT QUANTIZED)")
    logger.info("="*80)
    logger.info(f"Device: {'CUDA (GPU)' if torch.cuda.is_available() else 'CPU'}")

    # Load data
    logger.info("\n📂 Loading PSE training data...")
    with open('pse_comprehensive_training.jsonl', 'r') as f:
        training_data = [json.loads(line) for line in f if line.strip()]
    logger.info(f"✅ Loaded {len(training_data)} training examples")

    # Import transformers
    logger.info("\n📥 Importing transformers...")
    from transformers import (
        AutoTokenizer,
        AutoModelForCausalLM,
        TrainingArguments,
        Trainer,
        DataCollatorForLanguageModeling,
        BitsAndBytesConfig,
    )
    from datasets import Dataset
    from peft import LoraConfig, get_peft_model, TaskType

    # Prepare dataset
    logger.info("\n🔧 Preparing dataset...")
    formatted_data = []
    for example in training_data:
        formatted_data.append({
            'text': f"<|im_start|>system\nYou are an expert financial analyst specializing in Philippine Stock Exchange stocks.\n<|im_end|>\n<|im_start|>user\n{example['instruction']}\n{example['input']}\n<|im_end|>\n<|im_start|>assistant\n{example['output']}\n<|im_end|>"
        })
    dataset = Dataset.from_dict({'text': [d['text'] for d in formatted_data]})
    logger.info(f"✅ Dataset prepared: {len(dataset)} examples")

    # 8-bit quantization config
    logger.info("\n⚙️  Configuring 8-bit quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_8bit=True,
        bnb_8bit_compute_dtype=torch.float16,
        bnb_8bit_use_double_quant=True,
        bnb_8bit_quant_type="nf8",
    )

    # Load model in 8-bit
    logger.info("📥 Loading Gemma 2B model (8-bit quantized)...")
    model_name = "google/gemma-2b-it"

    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
    )

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    logger.info("✅ Model loaded in 8-bit (reduced from 5GB to ~2GB)")

    # LoRA config
    logger.info("\n⚙️  Configuring LoRA...")
    lora_config = LoraConfig(
        r=4,
        lora_alpha=8,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    model = get_peft_model(model, lora_config)
    model.gradient_checkpointing_enable()

    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    logger.info(f"✅ LoRA configured")
    logger.info(f"   Trainable: {trainable_params:,} / {total_params:,} ({100*trainable_params/total_params:.1f}%)")

    # Tokenize
    logger.info("\n🔄 Tokenizing dataset...")
    def tokenize_function(examples):
        outputs = tokenizer(
            examples['text'],
            truncation=True,
            max_length=256,
            padding='max_length',
        )
        outputs['labels'] = outputs['input_ids'].copy()
        return outputs

    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        num_proc=1,
        remove_columns=['text'],
    )
    logger.info(f"✅ Tokenization complete")

    # Training
    logger.info("\n" + "="*80)
    logger.info("📈 TRAINING STARTING")
    logger.info("="*80)

    training_args = TrainingArguments(
        output_dir="./gemma_pse_model",
        num_train_epochs=1,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=2,  # Reduced to 2
        warmup_steps=50,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=5,
        save_steps=30,
        save_total_limit=1,
        learning_rate=2e-4,
        fp16=True,
        seed=42,
        report_to="none",
        dataloader_num_workers=0,
        dataloader_pin_memory=True,
        remove_unused_columns=True,
        optim="adamw_8bit",
        max_grad_norm=1.0,
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

    try:
        trainer.train()
        logger.info("\n" + "="*80)
        logger.info("✅ TRAINING COMPLETE!")
        logger.info("="*80)

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
    main()
