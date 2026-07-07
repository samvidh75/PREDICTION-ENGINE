#!/usr/bin/env python3
"""
Local Gemma 2B Fine-Tuning on PSE Data
Complete training pipeline with:
- 30 years of PSE data
- Technical + Fundamental + Geopolitical analysis
- Local training (no Colab required)
- GPU/CPU automatic detection
"""

import torch
import json
import logging
import sys
import time
import os
from datetime import datetime
from pathlib import Path
import json
import subprocess

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

class GemmaPSETrainer:
    def __init__(self):
        self.start_time = datetime.now()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.training_data = []

        logger.info("="*80)
        logger.info("🚀 GEMMA 2B PSE FINE-TUNING STARTING")
        logger.info("="*80)
        logger.info(f"Device: {self.device}")
        logger.info(f"CUDA Available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    def check_dependencies(self):
        """Check and install required dependencies"""
        logger.info("\n📦 Checking dependencies...")

        required = [
            'torch',
            'transformers',
            'peft',
            'datasets',
            'accelerate',
            'bitsandbytes',
        ]

        missing = []
        for package in required:
            try:
                __import__(package)
                logger.info(f"✅ {package} found")
            except ImportError:
                missing.append(package)
                logger.warning(f"❌ {package} not found")

        if missing:
            logger.info(f"\n📥 Installing missing packages: {', '.join(missing)}")
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', '-q',
                'torch', 'transformers', 'peft', 'datasets', 'accelerate', 'bitsandbytes'
            ])
            logger.info("✅ Dependencies installed")

    def load_pse_data(self, data_file='pse_comprehensive_training.jsonl'):
        """Load PSE training data"""
        logger.info(f"\n📂 Loading PSE data from {data_file}...")

        if not os.path.exists(data_file):
            logger.error(f"❌ File not found: {data_file}")
            logger.info("Run: python scripts/pse_data_generator.py")
            return False

        try:
            with open(data_file, 'r') as f:
                self.training_data = [json.loads(line) for line in f if line.strip()]

            logger.info(f"✅ Loaded {len(self.training_data)} training examples")
            logger.info(f"   First example: {list(self.training_data[0].keys())}")
            return True
        except Exception as e:
            logger.error(f"❌ Error loading data: {e}")
            return False

    def prepare_dataset(self):
        """Prepare dataset for training"""
        logger.info("\n🔧 Preparing dataset...")

        try:
            from datasets import Dataset

            # Format data for training
            formatted_data = []
            for example in self.training_data:
                formatted_data.append({
                    'text': f"<|im_start|>system\nYou are an expert financial analyst specializing in Philippine Stock Exchange stocks.\n<|im_end|>\n<|im_start|>user\n{example['instruction']}\n{example['input']}\n<|im_end|>\n<|im_start|>assistant\n{example['output']}\n<|im_end|>"
                })

            dataset = Dataset.from_dict({
                'text': [d['text'] for d in formatted_data]
            })

            logger.info(f"✅ Dataset prepared: {len(dataset)} examples")
            return dataset
        except Exception as e:
            logger.error(f"❌ Error preparing dataset: {e}")
            return None

    def train_gemma(self, dataset):
        """Fine-tune Gemma 2B on PSE data"""
        logger.info("\n" + "="*80)
        logger.info("🎓 STARTING GEMMA 2B FINE-TUNING")
        logger.info("="*80)

        try:
            from transformers import (
                AutoTokenizer,
                AutoModelForCausalLM,
                TrainingArguments,
                Trainer,
                DataCollatorForLanguageModeling,
            )
            from peft import LoraConfig, get_peft_model, TaskType

            model_name = "google/gemma-2b-it"
            logger.info(f"📥 Loading model: {model_name}...")

            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            tokenizer.pad_token = tokenizer.eos_token

            # Load model with quantization for memory efficiency
            logger.info("⚙️  Loading model with optimizations...")

            if torch.cuda.is_available():
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16,
                    device_map="auto",
                    load_in_8bit=True,
                )
                logger.info("✅ Loaded in 8-bit quantization")
            else:
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float32,
                )
                model = model.to(self.device)
                logger.info("✅ Loaded in 32-bit (CPU)")

            # Setup LoRA for efficient fine-tuning
            logger.info("⚙️  Configuring LoRA...")
            lora_config = LoraConfig(
                r=16,
                lora_alpha=32,
                target_modules=["q_proj", "v_proj"],
                lora_dropout=0.05,
                bias="none",
                task_type=TaskType.CAUSAL_LM,
            )

            model = get_peft_model(model, lora_config)
            logger.info(f"✅ LoRA configured: {model.print_trainable_parameters()}")

            # Tokenize dataset
            logger.info("🔄 Tokenizing dataset...")

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
                num_proc=4,
                remove_columns=['text'],
            )

            logger.info(f"✅ Tokenization complete")

            # Training configuration
            training_args = TrainingArguments(
                output_dir="./gemma_pse_model",
                num_train_epochs=3,
                per_device_train_batch_size=4 if torch.cuda.is_available() else 1,
                gradient_accumulation_steps=4,
                warmup_steps=100,
                weight_decay=0.01,
                logging_dir='./logs',
                logging_steps=10,
                save_steps=100,
                save_total_limit=2,
                learning_rate=2e-4,
                fp16=torch.cuda.is_available(),
                seed=42,
                report_to="none",
            )

            # Create trainer
            logger.info("🚀 Creating trainer...")

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

            # Start training
            logger.info("\n" + "="*80)
            logger.info("📈 TRAINING IN PROGRESS")
            logger.info("="*80)

            start_time = time.time()
            trainer.train()
            elapsed_time = time.time() - start_time

            logger.info("\n" + "="*80)
            logger.info("✅ TRAINING COMPLETE")
            logger.info("="*80)
            logger.info(f"⏱️  Training time: {elapsed_time/3600:.2f} hours")

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

    def test_model(self):
        """Test the fine-tuned model"""
        logger.info("\n" + "="*80)
        logger.info("🧪 TESTING FINE-TUNED MODEL")
        logger.info("="*80)

        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM

            logger.info("📥 Loading fine-tuned model...")
            model_path = "./gemma_pse_model_final"

            if not os.path.exists(model_path):
                logger.warning("⚠️  Model path not found, skipping test")
                return

            tokenizer = AutoTokenizer.from_pretrained(model_path)
            model = AutoModelForCausalLM.from_pretrained(model_path)
            model = model.to(self.device)

            # Test prompts
            test_prompts = [
                "Analyze BDO stock performance in 2024",
                "What is the investment recommendation for JFC?",
                "Explain the technical indicators for SM stock",
            ]

            for prompt in test_prompts:
                logger.info(f"\n📝 Test prompt: {prompt}")

                inputs = tokenizer(prompt, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_length=200,
                        temperature=0.7,
                        top_p=0.9,
                    )

                response = tokenizer.decode(outputs[0], skip_special_tokens=True)
                logger.info(f"💬 Response: {response[:200]}...")

        except Exception as e:
            logger.error(f"❌ Test failed: {e}")

    def run(self):
        """Run complete training pipeline"""
        logger.info("\n🎯 Starting complete training pipeline...\n")

        # 1. Check dependencies
        self.check_dependencies()

        # 2. Load data
        if not self.load_pse_data():
            return False

        # 3. Prepare dataset
        dataset = self.prepare_dataset()
        if dataset is None:
            return False

        # 4. Train model
        if not self.train_gemma(dataset):
            return False

        # 5. Test model
        self.test_model()

        # Summary
        logger.info("\n" + "="*80)
        logger.info("🎉 GEMMA PSE FINE-TUNING COMPLETE!")
        logger.info("="*80)
        logger.info(f"✅ Model saved to: ./gemma_pse_model_final")
        logger.info(f"📊 Trained on: {len(self.training_data)} examples")
        logger.info(f"⏱️  Total time: {(datetime.now() - self.start_time).total_seconds()/3600:.2f} hours")
        logger.info(f"💾 Log file: gemma_pse_training.log")

        return True

def main():
    trainer = GemmaPSETrainer()
    success = trainer.run()
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
