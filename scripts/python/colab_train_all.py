#!/usr/bin/env python3
"""
colab_train_all.py — Run this in Google Colab (Runtime → Run all).

Trains two LoRA adapters:
  1. Qwen2.5-0.5B-Instruct (CodeEX — local Ollama)
  2. Google Gemma-2B-it       (Cloudflare Workers AI)

Output zip files download automatically after training.
"""

# --- Install deps ---
import subprocess, sys, os, json, math, random, zipfile, glob, textwrap

subprocess.check_call([
    sys.executable, "-m", "pip", "install",
    "torch", "transformers", "datasets", "trl", "peft", "accelerate",
    "-q",
])

# --- Imports ---
import torch
from datasets import load_dataset, Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# ──────────────────────────────────────────────
# 1. Generate synthetic datasets
# ──────────────────────────────────────────────

print("=" * 60)
print("Step 1: Generating synthetic training datasets")
print("=" * 60)

TICKERS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL",
    "ITC", "WIPRO", "HCLTECH", "LT", "AXISBANK", "BAJFINANCE", "MARUTI",
    "SUNPHARMA", "TITAN", "ASIANPAINT", "NTPC", "KOTAKBANK", "ONGC",
]
SECTORS = {
    "RELIANCE": "Energy", "TCS": "IT", "HDFCBANK": "Banking", "INFY": "IT",
    "ICICIBANK": "Banking", "SBIN": "Banking", "BHARTIARTL": "Telecom",
    "ITC": "FMCG", "WIPRO": "IT", "HCLTECH": "IT", "LT": "Infrastructure",
    "AXISBANK": "Banking", "BAJFINANCE": "NBFC", "MARUTI": "Automobile",
    "SUNPHARMA": "Pharma", "TITAN": "Retail", "ASIANPAINT": "Chemicals",
    "NTPC": "Energy", "KOTAKBANK": "Banking", "ONGC": "Energy",
}

def rand_float(lo, hi):
    return round(random.uniform(lo, hi), 2)

def gen_encyclopedia_entry(ticker):
    sector = SECTORS.get(ticker, "Unknown")
    pe = rand_float(8, 60)
    pb = rand_float(0.5, 15)
    de = rand_float(0.1, 3.5)
    roce = rand_float(5, 40)
    sales_growth = rand_float(-5, 30)
    profit_growth = rand_float(-10, 50)
    mcap_cr = rand_float(5000, 2000000)
    rating = random.choices(
        ["Strong Buy", "Buy", "Hold", "Reduce", "Sell"],
        weights=[15, 30, 30, 15, 10],
    )[0]
    target_vs_cmp = random.choice(["above", "below", "in line with"])

    exchange = random.choice(["BSE", "NSE"])
    auditor = random.choice([
        "Deloitte Haskins & Sells LLP",
        "S R Batliboi & Associates LLP",
        "Price Waterhouse Chartered Accountants LLP",
        "BSR & Co. LLP",
        "Walker Chandiok & Co LLP",
    ])
    board_remarks = random.choice([
        "No material qualifications",
        "Emphasised going concern uncertainty",
        "Qualified opinion on inventory valuation",
        "Unmodified opinion",
    ])
    roce_class = "Excellent (>25%)" if roce > 25 else "Good (15-25%)" if roce > 15 else "Average (8-15%)" if roce > 8 else "Weak (<8%)"
    de_class = "Conservative (<0.5)" if de < 0.5 else "Moderate (0.5-1.5)" if de < 1.5 else "High (>1.5)"

    instruction = f"Analyse {ticker} fundamentals and provide a concise research overview."
    response = textwrap.dedent(f"""\
    ## {ticker} — Research Summary ({exchange})
    **Sector:** {sector} | **Auditor:** {auditor}
    **Board Remarks:** {board_remarks}

    | Metric | Value | Assessment |
    |---|---|---|
    | Market Cap | ₹{mcap_cr:,} Cr | — |
    | P/E | {pe:.1f}x | — |
    | P/B | {pb:.1f}x | — |
    | D/E | {de:.1f}x | {de_class} |
    | ROCE | {roce:.1f}% | {roce_class} |
    | Sales Growth (YoY) | {sales_growth:+.1f}% | — |
    | Profit Growth (YoY) | {profit_growth:+.1f}% | — |

    **Rating:** {rating} | **Target:** {target_vs_cmp} CMP

    **Why it matters:** {ticker} operates in the {sector} sector with a {roce_class.lower()} return profile and {de_class.lower()} leverage. \
    The stock trades at {pe:.1f}x earnings with {sales_growth:+.1f}% revenue momentum.

    **Risk:** Key risks include sector cyclicality and auditor {board_remarks.lower()}.
    """).strip()
    return {"instruction": instruction, "response": response}

def gen_tool_call(ticker):
    q_templates = [
        f"What is the current P/E ratio of {ticker}?",
        f"Calculate SMA-20 and SMA-50 for {ticker}",
        f"Show me the MACD for {ticker}",
        f"Compute RSI-14 for {ticker}",
        f"What is the D/E ratio of {ticker}?",
        f"Calculate Bollinger Bands for {ticker}",
        f"Give me all key metrics for {ticker}",
        f"Show P/E, P/B, and ROCE for {ticker}",
    ]
    query = random.choice(q_templates)
    tool_name = random.choice(["calculate_indian_market_metrics", "calculate_batch_market_metrics"])
    params = json.dumps({"ticker": ticker, "metrics": "ALL"})
    system = "You are a financial analyst. Use the available tools to compute exact numbers — never hallucinate."
    user = query
    assistant = json.dumps({
        "tool": tool_name,
        "arguments": {"ticker": ticker, "metrics": "ALL"}
    })
    return {"instruction": query, "response": assistant}

print("Generating encyclopedia dataset (2,000 pairs)...")
encyclopedia_data = []
for i in range(2000):
    ticker = random.choice(TICKERS)
    encyclopedia_data.append(gen_encyclopedia_entry(ticker))

print("Generating agent dataset (2,000 pairs)...")
agent_data = []
for i in range(2000):
    ticker = random.choice(TICKERS)
    agent_data.append(gen_tool_call(ticker))

def to_chatml(entry):
    return {"text": f"<|im_start|>system\n{entry['instruction']}<|im_end|>\n<|im_start|>user\n{entry['response']}<|im_end|>\n<|im_start|>assistant\n<|im_end|>"}

enc_dataset = Dataset.from_list([to_chatml(d) for d in encyclopedia_data])
agt_dataset = Dataset.from_list([to_chatml(d) for d in agent_data])

# ──────────────────────────────────────────────
# 2. Train Qwen2.5-0.5B (CodeEX — Local Ollama)
# ──────────────────────────────────────────────

print("=" * 60)
print("Step 2: Training Qwen2.5-0.5B-Instruct (CodeEX)")
print("=" * 60)

MODEL_QWEN = "Qwen/Qwen2.5-0.5B-Instruct"
DIR_QWEN = "/content/stockex_slm_agent_output"

tokenizer_q = AutoTokenizer.from_pretrained(MODEL_QWEN, trust_remote_code=True)
tokenizer_q.pad_token = tokenizer_q.eos_token

model_q = AutoModelForCausalLM.from_pretrained(
    MODEL_QWEN, torch_dtype=torch.float16, device_map="auto",
)

lora_q = LoraConfig(
    r=16, lora_alpha=32, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
)
model_q = get_peft_model(model_q, lora_q)

args_q = TrainingArguments(
    output_dir=DIR_QWEN, per_device_train_batch_size=2,
    gradient_accumulation_steps=4, learning_rate=2e-4, num_train_epochs=3,
    save_strategy="epoch", fp16=True, logging_steps=10, report_to="none",
)

trainer_q = SFTTrainer(
    model=model_q, train_dataset=agt_dataset, args=args_q,
    peft_config=lora_q, max_seq_length=512, dataset_text_field="text",
)
trainer_q.train()
trainer_q.model.save_pretrained(DIR_QWEN)
tokenizer_q.save_pretrained(DIR_QWEN)

print(f"Qwen adapter saved to {DIR_QWEN}")

# ──────────────────────────────────────────────
# 3. Train Google Gemma-2B (Cloudflare)
# ──────────────────────────────────────────────

print("=" * 60)
print("Step 3: Training Google Gemma-2B-it (Cloudflare)")
print("=" * 60)

MODEL_GEMMA = "google/gemma-2b-it"
DIR_GEMMA = "/content/finetune_artifacts"

tokenizer_g = AutoTokenizer.from_pretrained(MODEL_GEMMA, trust_remote_code=True)
tokenizer_g.pad_token = tokenizer_g.eos_token

model_g = AutoModelForCausalLM.from_pretrained(
    MODEL_GEMMA, torch_dtype=torch.float16, device_map="auto",
)

lora_g = LoraConfig(
    r=16, lora_alpha=32, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
)
model_g = get_peft_model(model_g, lora_g)

args_g = TrainingArguments(
    output_dir=DIR_GEMMA, per_device_train_batch_size=2,
    gradient_accumulation_steps=4, learning_rate=2e-4, num_train_epochs=3,
    save_strategy="epoch", fp16=True, logging_steps=10, report_to="none",
)

trainer_g = SFTTrainer(
    model=model_g, train_dataset=enc_dataset, args=args_g,
    peft_config=lora_g, max_seq_length=512, dataset_text_field="text",
)
trainer_g.train()
trainer_g.model.save_pretrained(DIR_GEMMA)
tokenizer_g.save_pretrained(DIR_GEMMA)

# Patch adapter_config.json for Cloudflare
ac_path = os.path.join(DIR_GEMMA, "adapter_config.json")
if os.path.exists(ac_path):
    with open(ac_path) as f:
        cfg = json.load(f)
    cfg["model_type"] = "gemma"
    with open(ac_path, "w") as f:
        json.dump(cfg, f, indent=2)

print(f"Gemma adapter saved to {DIR_GEMMA}")

# ──────────────────────────────────────────────
# 4. Zip and download
# ──────────────────────────────────────────────

print("=" * 60)
print("Step 4: Packaging artifacts")
print("=" * 60)

for name, src_dir in [("qwen_codeex", DIR_QWEN), ("gemma_cloudflare", DIR_GEMMA)]:
    zip_path = f"/content/{name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in glob.glob(os.path.join(src_dir, "**", "*"), recursive=True):
            if os.path.isfile(fpath):
                zf.write(fpath, os.path.relpath(fpath, src_dir))
    print(f"Created {zip_path} — download this file.")

print()
print("=" * 60)
print("ALL DONE. Download both zip files from the Files sidebar.")
print("=" * 60)
print()
print("After download:")
print("  qwen_codeex.zip → extract to ./stockex_slm_agent_output/")
print("  gemma_cloudflare.zip → extract to ./finetune_artifacts/")
print()
print("Then on your local machine:")
print("  ollama create CodeEX -f Modelfile")
print("  cron/cloudflare_tune.sh")
