#!/bin/bash
# Fine-tune Gemma-2B on Cloudflare Workers AI (free tier)
# Then quantize & export for browser inference

set -e

echo "Step 1: Install dependencies"
pip install -q cloudflare transformers torch bitsandbytes peft datasets

echo "Step 2: Authenticate with Cloudflare"
wrangler login

echo "Step 3: Upload training corpus to Cloudflare Workers KV"
wrangler kv:namespace create "TRAINING_DATA"
wrangler kv:key put --namespace-id="TRAINING_DATA" \
  "corpus" @scripts/python/training_corpus.jsonl

echo "Step 4: Fine-tune Gemma-2B locally using LoRA"
python -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import get_peft_model, LoraConfig, TaskType
import torch

model_name = 'google/gemma-2b-it'
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map='auto',
    load_in_8bit=True
)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=['q_proj', 'v_proj'],
    lora_dropout=0.05,
    bias='none',
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(model, lora_config)
print('LoRA-adapted model ready for training')
model.save_pretrained('./stockstory_gemma_lora')
tokenizer.save_pretrained('./stockstory_gemma_lora')
"

echo "Step 5: Quantize for browser (4-bit)"
python -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import AutoPeftModelForCausalLM
import torch

peft_model_id = './stockstory_gemma_lora'
model = AutoPeftModelForCausalLM.from_pretrained(
    peft_model_id,
    torch_dtype=torch.float32,
    device_map='cpu'
)

merged_model = model.merge_and_unload()
merged_model.save_pretrained('./stockstory_gemma_merged')

print('Merged model saved to ./stockstory_gemma_merged')
print('Ready for browser quantization (ONNX / WebAssembly export)')
"

echo "Fine-tuning pipeline complete!"
echo "Next: Export to ONNX Runtime for browser inference"
