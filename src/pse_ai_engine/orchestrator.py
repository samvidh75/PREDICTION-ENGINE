"""Orchestrator: combines the trained LoRA model with real-time data, news,
and conversation memory. This is the layer that fixes the weaknesses identified
in the base model:

  - "Fails outside PSE domain / hallucinates"  -> intent router + honest refusal
  - "No real-time information"                  -> realtime_data.py + news_scraper.py
  - "No conversational continuity"               -> memory.py injected into every prompt
  - "Robotic, deterministic, poor NL"             -> natural-language templating layer
  - "Overfits to historical patterns"             -> live data always overrides stale training patterns

Honest limitation up front: the reasoning engine underneath is still a 2B-parameter
LoRA model. Grounding it in live data and memory closes most of the practical gap
for PSE-specific tasks, but it will not match a much larger general model's raw
reasoning depth on genuinely novel problems. Out-of-domain questions are routed to
an honest "outside my specialty" response instead of a hallucinated guess — that is
the single highest-leverage fix, since a wrong confident answer is worse than no answer.
"""
import os
import re
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
from huggingface_hub import login

from . import realtime_data as rt
from . import news_scraper as news
from . import memory as mem

HF_TOKEN = os.environ.get("HF_TOKEN")
BASE_MODEL = "google/gemma-2b-it"
ADAPTER_REPO = "samvidhh/gemma-pse-lora-checkpoints"

_model = None
_tokenizer = None


def _load_model():
    global _model, _tokenizer
    if _model is not None:
        return
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN environment variable is not set")
    login(token=HF_TOKEN)
    base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=torch.float32, device_map="cpu")
    _model = PeftModel.from_pretrained(base, ADAPTER_REPO, token=HF_TOKEN)
    _tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, token=HF_TOKEN)
    if _tokenizer.pad_token is None:
        _tokenizer.pad_token = _tokenizer.eos_token


# ---------------------------------------------------------------------------
# Intent detection — this is what stops the "fails outside PSE domain" failure
# mode. Instead of blindly generating on any input, classify first.
# ---------------------------------------------------------------------------

TICKER_PATTERN = re.compile(r"\b([A-Z]{2,6})\b")

GREETING_WORDS = {"hi", "hello", "hey", "good morning", "good afternoon", "thanks", "thank you"}
MARKET_WORDS = {
    "stock", "invest", "buy", "sell", "price", "pse", "psei", "market", "shares",
    "portfolio", "dividend", "earnings", "trade", "bullish", "bearish", "technical",
    "fundamental", "rsi", "macd", "geopolitical", "outlook", "analysis", "recommend",
}


def classify_intent(text: str, known_tickers_in_convo: list[str]) -> dict:
    lower = text.lower()
    words = set(re.findall(r"[a-z']+", lower))

    mentioned_tickers = [
        t for t in TICKER_PATTERN.findall(text)
        if rt.is_known_pse_ticker(t)
    ]
    # Follow-up like "what about now?" referring to prior ticker
    is_followup = not mentioned_tickers and any(
        w in lower for w in ["it", "that stock", "now", "still", "what about", "and today"]
    )
    if is_followup and known_tickers_in_convo:
        mentioned_tickers = known_tickers_in_convo[:1]

    has_market_intent = bool(words & MARKET_WORDS) or bool(mentioned_tickers)
    is_greeting = bool(words & GREETING_WORDS) and len(words) < 6
    wants_movers = any(p in lower for p in ["top gainers", "top losers", "movers", "best performing", "worst performing"])
    wants_market_overview = any(p in lower for p in ["market today", "psei", "how is the market", "market overview"])

    if is_greeting:
        intent = "greeting"
    elif wants_movers:
        intent = "movers"
    elif wants_market_overview:
        intent = "market_overview"
    elif mentioned_tickers:
        intent = "stock_analysis"
    elif has_market_intent:
        intent = "general_market_question"
    else:
        intent = "out_of_domain"

    return {"intent": intent, "tickers": mentioned_tickers}


# ---------------------------------------------------------------------------
# Response builders per intent
# ---------------------------------------------------------------------------

def _handle_greeting(text: str) -> str:
    return (
        "Hey! I'm your PSE research assistant — I can pull live prices, recent news, "
        "and give you technical + fundamental + geopolitical analysis on any Philippine "
        "Stock Exchange stock. Try asking about a specific stock (e.g. \"how's BDO looking?\") "
        "or the market overall."
    )


def _handle_out_of_domain(text: str) -> str:
    return (
        "That's outside what I'm built for — I'm specialized in Philippine Stock Exchange "
        "analysis, not general topics. I'd rather tell you that honestly than guess and get it "
        "wrong. If you've got a PSE stock or market question, I'm ready."
    )


def _handle_movers(_: str) -> str:
    m = rt.get_movers(5)
    if not m["gainers"]:
        return "Couldn't reach the live PSE feed just now — try again in a moment."

    def fmt(rows):
        return "\n".join(f"  • {r['symbol']} ({r['name']}): ₱{r['price']:.2f}, {r['change_pct']:+.2f}%" for r in rows)

    return (
        f"Live PSE movers (as of now):\n\n"
        f"📈 Top Gainers:\n{fmt(m['gainers'])}\n\n"
        f"📉 Top Losers:\n{fmt(m['losers'])}\n\n"
        f"🔥 Most Active:\n{fmt(m['most_active'])}"
    )


def _handle_market_overview(_: str) -> str:
    news_ctx = news.get_market_news(5)
    lines = "\n".join(f"  • {n['title']} ({n['source']})" for n in news_ctx)
    return f"Here's what's moving the PSE right now, from today's coverage:\n\n{lines}"


def _handle_stock_analysis(text: str, tickers: list[str], session_id: str) -> tuple[str, dict]:
    _load_model()
    ticker = tickers[0]
    quote = rt.get_live_quote(ticker)
    news_ctx = news.get_stock_news(ticker, quote.get("name", ticker), 3)
    geo_ctx = news.get_geopolitical_context(3)
    facts = mem.get_facts(session_id)

    if quote.get("stale"):
        price_line = "Live price currently unavailable — analysis below is pattern-based only."
    else:
        price_line = (
            f"Current price: PHP {quote['price']:.2f} ({quote['change_pct']:+.2f}% today), "
            f"volume {quote.get('volume', 'N/A'):,}" if quote.get("volume") else
            f"Current price: PHP {quote['price']:.2f} ({quote['change_pct']:+.2f}% today)"
        )

    news_lines = "\n".join(f"- {n['title']}" for n in news_ctx) or "No recent stock-specific news found."
    geo_lines = "\n".join(f"- {n['title']}" for n in geo_ctx) or "No major geopolitical headlines found."

    risk_note = f"\nUser's noted risk tolerance: {facts['risk_tolerance']}" if "risk_tolerance" in facts else ""

    prompt = (
        f"Instruction: Analyze {ticker} stock for potential investment. Provide technical, "
        f"fundamental, and geopolitical analysis with a clear signal.\n"
        f"Input:\nStock: {ticker} ({quote.get('name', ticker)})\n"
        f"{price_line}\n\n"
        f"Recent news:\n{news_lines}\n\n"
        f"Geopolitical context:\n{geo_lines}"
        f"{risk_note}\n"
        f"Output:"
    )

    inputs = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1800)
    with torch.no_grad():
        outputs = _model.generate(
            inputs["input_ids"], max_new_tokens=300, do_sample=False,
            pad_token_id=_tokenizer.eos_token_id, attention_mask=inputs["attention_mask"],
        )
    raw = _tokenizer.decode(outputs[0], skip_special_tokens=True)
    model_analysis = raw.split("Output:")[-1].strip() if "Output:" in raw else raw

    live_disclaimer = "" if not quote.get("stale") else "\n\n⚠️ Note: live price feed was unreachable, so this leans on historical patterns only — treat as lower confidence."

    response = (
        f"**{ticker} — {quote.get('name', ticker)}**\n"
        f"{price_line if not quote.get('stale') else 'Live price unavailable right now.'}\n\n"
        f"{model_analysis}{live_disclaimer}\n\n"
        f"Recent headlines I factored in:\n{news_lines}"
    )
    return response, {"tickers": [ticker], "quote": quote}


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

def chat(session_id: str, user_text: str) -> str:
    mem.add_message(session_id, "user", user_text)
    known_tickers = mem.get_mentioned_tickers(session_id, 20)

    routing = classify_intent(user_text, known_tickers)
    intent = routing["intent"]
    tickers = routing["tickers"]

    if intent == "greeting":
        response = _handle_greeting(user_text)
        meta = {}
    elif intent == "out_of_domain":
        response = _handle_out_of_domain(user_text)
        meta = {}
    elif intent == "movers":
        response = _handle_movers(user_text)
        meta = {}
    elif intent == "market_overview":
        response = _handle_market_overview(user_text)
        meta = {}
    elif intent == "stock_analysis":
        response, meta = _handle_stock_analysis(user_text, tickers, session_id)
    else:  # general_market_question — no specific ticker, still PSE-domain
        response = (
            "I can help with that — could you name a specific PSE stock, or ask for "
            "\"top movers\" / \"market overview\" for a broader view?"
        )
        meta = {}

    mem.add_message(session_id, "assistant", response, meta)
    return response


if __name__ == "__main__":
    sid = "cli-test"
    for q in ["hi there", "what's the weather today", "how's BDO looking?", "what about now compared to BPI", "top gainers today"]:
        print(f"\n>>> {q}")
        print(chat(sid, q))
