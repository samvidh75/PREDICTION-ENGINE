#!/usr/bin/env python3
"""Merge all conversational datasets with the encyclopedia data."""
import json
import os

conversational_files = [
    "stockex_conversational_dataset.jsonl",
    "stockex_expanded_conversational.jsonl",
]

encyclopedia_file = "stockex_encyclopedia_dataset.jsonl"
output_file = "stockex_combined_dataset.jsonl"

seen = set()
all_records = []

# Load conversational data (de-duplicated)
for fname in conversational_files:
    if os.path.exists(fname):
        with open(fname) as f:
            for line in f:
                rec = json.loads(line)
                key = json.dumps(rec["messages"], sort_keys=True)
                if key not in seen:
                    seen.add(key)
                    all_records.append(rec)

# Load encyclopedia data
if os.path.exists(encyclopedia_file):
    with open(encyclopedia_file) as f:
        for line in f:
            rec = json.loads(line)
            # Update system prompt to be more conversational
            rec["messages"][0]["content"] = (
                "You are StockEX, a helpful, friendly, and knowledgeable AI assistant "
                "specialised in Indian stock market research. You provide accurate "
                "financial data and educational content. You NEVER give personalised "
                "investment advice."
            )
            key = json.dumps(rec["messages"], sort_keys=True)
            if key not in seen:
                seen.add(key)
                all_records.append(rec)

with open(output_file, "w") as f:
    for rec in all_records:
        f.write(json.dumps(rec) + "\n")

total_conv = sum(1 for r in all_records if "encyclopedic" not in r["messages"][1]["content"].lower())
total_enc = len(all_records) - total_conv

print(f"Final dataset: {total_conv} conversational + {total_enc} encyclopedia = {len(all_records)} total")
print(f"→ {output_file}")
print(f"Sample conversational record:")
for r in all_records:
    if "encyclopedic" not in r["messages"][1]["content"].lower():
        print(json.dumps(r, indent=2)[:400])
        break
