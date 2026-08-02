#!/usr/bin/env python3
"""
End-to-end test: model inference -> placeholder resolution -> human-readable text.

Usage:
    python3 scripts/python/test_encyclopedia_pipeline.py
"""

import json, sys
sys.path.insert(0, 'scripts/python')
from resolve_placeholders import resolve_placeholders, fetch_data_for_ticker

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

TEST_STOCKS = ['TCS', 'RELIANCE', 'HDFCBANK', 'SBIN', 'INFY', 'HINDUNILVR']

def main():
    print("=" * 70)
    print("StockEX Encyclopedia Pipeline — End-to-End Test")
    print("=" * 70)

    tokenizer = AutoTokenizer.from_pretrained(
        'Qwen/Qwen2.5-0.5B-Instruct', trust_remote_code=True
    )
    base = AutoModelForCausalLM.from_pretrained(
        'Qwen/Qwen2.5-0.5B-Instruct', torch_dtype=torch.float32, device_map='cpu'
    )
    model = PeftModel.from_pretrained(base, './stockex_slm_agent_output')
    model.eval()

    passes = 0
    for ticker in TEST_STOCKS:
        print(f"\n{'─' * 70}")
        print(f"  Stock: {ticker}")
        print(f"{'─' * 70}")

        # Step 1: Generate template
        prompt = (
            '<|im_start|>system\n'
            'You are the official StockEX Encyclopedia. Provide deterministic, '
            'mathematically accurate reference data for Indian equities.<|im_end|>\n'
            '<|im_start|>user\n'
            f'Provide encyclopedic reference overview and structural risk audit metrics for: {ticker}.<|im_end|>\n'
            '<|im_start|>assistant\n'
        )
        inputs = tokenizer(prompt, return_tensors='pt')
        with torch.no_grad():
            out = model.generate(**inputs, max_new_tokens=200, do_sample=False)
        result = tokenizer.decode(out[0], skip_special_tokens=True)

        # Extract template
        template = result.split('<|im_start|>assistant\n')[-1].replace('<|im_end|>', '').strip()

        has_placeholders = '{' in template
        print(f"  Template valid: {'YES' if has_placeholders else 'NO'}")

        if not has_placeholders:
            print(f"  FAIL: {template[:100]}...")
            continue

        # Step 2: Resolve placeholders with fake but realistic data
        data = fetch_data_for_ticker(ticker)
        filled = resolve_placeholders(template, data)

        # Step 3: Verify output quality
        checks = [
            (ticker in filled, f"contains ticker {ticker}"),
            ('StockEX' in filled, 'contains StockEX brand'),
            ('exchange grid' in filled, 'contains exchange grid'),
            ('capitalization profile' in filled, 'contains cap profile'),
            ('P/E' in filled, 'contains P/E ratio'),
            ('Debt-to-Equity' in filled, 'contains D/E ratio'),
            ('promoter group pledged' in filled, 'contains pledge info'),
            ('auditor verification' in filled, 'contains audit info'),
            ('{' not in filled, 'no unresolved placeholders'),
        ]
        all_pass = all(ok for ok, _ in checks)
        if all_pass:
            passes += 1

        for ok, desc in checks:
            print(f"  {'PASS' if ok else 'FAIL'}: {desc}")

        print(f"\n  >> {filled}")

    print(f"\n{'=' * 70}")
    print(f"  Result: {passes}/{len(TEST_STOCKS)} passed")
    print(f"{'=' * 70}")
    sys.exit(0 if passes == len(TEST_STOCKS) else 1)


if __name__ == '__main__':
    main()
