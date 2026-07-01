"""
Unsloth Fine-Tuning Script for Indian Stock Market SLM
=======================================================
Trains Qwen2.5-0.5B-Instruct on custom Healthometer + trend summaries.
Run on Google Colab (free T4) or Kaggle.

Installation (Colab):
  !pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
  !pip install --no-deps xformers trl peft accelerate bitsandbytes
"""

from unsloth import FastLanguageModel
import torch
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset

max_seq_length = 2048
dtype = None
load_in_4bit = True

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="Qwen/Qwen2.5-0.5B-Instruct",
    max_seq_length=max_seq_length,
    dtype=dtype,
    load_in_4bit=load_in_4bit,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

prompt_format = """<|im_start|>system
You are a dedicated Indian stock market analyst. Use the context to provide a concise Healthometer assessment with score and risk level.
<|im_start|>user
Task: {}
Context: {}
<|im_start|>assistant
{}<|im_end|>"""


def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    inputs = examples["input"]
    outputs = examples["output"]
    texts = []
    for inst, inp, out in zip(instructions, inputs, outputs):
        texts.append(prompt_format.format(inst, inp, out))
    return {"text": texts}


dataset = load_dataset("json", data_files="master_indian_market_train.json", split="train")
dataset = dataset.map(formatting_prompts_func, batched=True)

steps = 180

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=max_seq_length,
    dataset_num_proc=2,
    packing=False,
    args=TrainingArguments(
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        max_steps=steps,
        learning_rate=3e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        output_dir="outputs",
        save_steps=steps,
    ),
)

trainer_stats = trainer.train()

model.save_pretrained_merged("indian_stock_slm_master", tokenizer, save_method="merged_16bit")
print("Merged model saved to 'indian_stock_slm_master'")

model.save_pretrained_gguf("indian_stock_slm_master_gguf", tokenizer, quantization_method="q4_k_m")
print("GGUF model saved for web deployment")
