import json, re

INPUT = "stockex_encyclopedia_dataset.jsonl"
OUTPUT = "stockex_encyclopedia_placeholders.jsonl"

PLACEHOLDER_EXCHANGE = {
    "NSE Mainboard/SME": "{exchange_nse}",
    "BSE": "{exchange_bse}",
}

PLACEHOLDER_AUDIT = {
    "Clean audit opinion": "{audit_clean}",
    "Clean audit with no material misstatements": "{audit_clean_no_misstate}",
    "Qualified opinion on contingent liabilities": "{audit_qualified}",
    "Unmodified opinion": "{audit_unmodified}",
    "Unmodified opinion with emphasis of matter": "{audit_unmodified_emphasis}",
}

def transform_assistant(text):
    text = re.sub(
        r" confirms `([A-Z0-9&]+)`",
        " confirms `{ticker}`",
        text,
    )
    for exchange, placeholder in PLACEHOLDER_EXCHANGE.items():
        text = text.replace(f"`{exchange}`", f"`{placeholder}`")
    text = re.sub(r"Rs[\d,]+\.\d+ Cr", "{market_cap} Cr", text)
    text = re.sub(r"Rs[\d,]+ Cr", "{market_cap} Cr", text)
    text = re.sub(
        r"trading at a valuation multiple of [\d.]+x P/E",
        "trading at a valuation multiple of {pe_ratio}x P/E",
        text,
    )
    text = re.sub(
        r"with a Debt-to-Equity ledger rating of [\d.]+",
        "with a Debt-to-Equity ledger rating of {de_ratio}.",
        text,
    )
    text = re.sub(
        r"shows [\d.]+% promoter group",
        "shows {pledge_pct}% promoter group",
        text,
    )
    text = re.sub(
        r"shows [\d.]+ % promoter group",
        "shows {pledge_pct}% promoter group",
        text,
    )
    for opinion, placeholder in PLACEHOLDER_AUDIT.items():
        text = text.replace(f"'{opinion}'", f"'{placeholder}'")
    return text

count = 0
with open(INPUT) as fin, open(OUTPUT, "w") as fout:
    for line in fin:
        entry = json.loads(line)
        entry["messages"][2]["content"] = transform_assistant(
            entry["messages"][2]["content"]
        )
        fout.write(json.dumps(entry, ensure_ascii=False) + "\n")
        count += 1

print(f"Transformed {count} entries -> {OUTPUT}")
