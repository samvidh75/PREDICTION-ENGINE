#!/usr/bin/env python3
"""
Test the Fine-Tuned Gemma 2B PSE Model
Interactive testing and evaluation
"""

import torch
import json
from transformers import AutoTokenizer, AutoModelForCausalLM

def load_model():
    """Load the fine-tuned model"""
    model_path = "./gemma_pse_model_final"

    print("📥 Loading fine-tuned model...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(model_path)

        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = model.to(device)
        model.eval()

        print(f"✅ Model loaded on device: {device}")
        return model, tokenizer, device
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        print("Make sure you've run: python3 scripts/gemma_pse_training.py")
        return None, None, None

def generate_response(model, tokenizer, device, prompt, max_length=300):
    """Generate a response from the model"""
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=max_length,
                temperature=0.7,
                top_p=0.9,
                top_k=50,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
            )

        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response
    except Exception as e:
        return f"Error generating response: {e}"

def run_tests():
    """Run test queries against the model"""
    model, tokenizer, device = load_model()
    if model is None:
        return

    print("\n" + "="*80)
    print("🧪 TESTING GEMMA 2B PSE MODEL")
    print("="*80)

    # Test queries
    test_queries = [
        "Analyze BDO stock performance and key metrics",
        "What is the technical outlook for JFC stock?",
        "Provide investment recommendation for SM Holdings",
        "Explain the fundamental value of AEV stock",
        "Compare PSE banking sector stocks: BDO vs BPI vs UBP",
        "How did COVID-19 impact PSE stocks?",
        "What are the key technical indicators for a strong PSE stock?",
        "Analyze market sentiment for Philippine stocks in 2024",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n{'─'*80}")
        print(f"📝 Query {i}: {query}")
        print(f"{'─'*80}")

        response = generate_response(model, tokenizer, device, query)
        print(f"💬 Response:\n{response[:500]}...\n")

def interactive_mode():
    """Run interactive mode"""
    model, tokenizer, device = load_model()
    if model is None:
        return

    print("\n" + "="*80)
    print("💬 INTERACTIVE MODE")
    print("="*80)
    print("Ask the model about PSE stocks!")
    print("Type 'quit' to exit\n")

    while True:
        try:
            query = input("You: ").strip()
            if query.lower() in ['quit', 'exit', 'q']:
                break
            if not query:
                continue

            print("\nGenerating response...")
            response = generate_response(model, tokenizer, device, query)
            print(f"\n🤖 Model:\n{response}\n")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

def evaluate_model():
    """Evaluate model on benchmark questions"""
    model, tokenizer, device = load_model()
    if model is None:
        return

    print("\n" + "="*80)
    print("📊 MODEL EVALUATION")
    print("="*80)

    # Benchmark questions
    benchmarks = [
        {
            "question": "What does RSI > 70 indicate?",
            "expected_keywords": ["overbought", "overextended", "correction"]
        },
        {
            "question": "What is a good P/E ratio for value stocks?",
            "expected_keywords": ["12", "15", "below", "low", "undervalued"]
        },
        {
            "question": "How does debt affect stock valuation?",
            "expected_keywords": ["risk", "equity", "leverage", "return", "cost"]
        },
    ]

    scores = []
    for benchmark in benchmarks:
        print(f"\n📋 Question: {benchmark['question']}")
        response = generate_response(model, tokenizer, device, benchmark['question'])

        # Simple scoring based on keyword presence
        score = sum(1 for kw in benchmark['expected_keywords'] if kw.lower() in response.lower())
        max_score = len(benchmark['expected_keywords'])
        percentage = (score / max_score * 100) if max_score > 0 else 0

        print(f"Response: {response[:200]}...")
        print(f"✓ Score: {score}/{max_score} ({percentage:.0f}%)")
        scores.append(percentage)

    avg_score = sum(scores) / len(scores) if scores else 0
    print(f"\n{'─'*80}")
    print(f"📈 Average Evaluation Score: {avg_score:.1f}%")
    if avg_score >= 80:
        print("🟢 Model performs well!")
    elif avg_score >= 60:
        print("🟡 Model performance is acceptable")
    else:
        print("🔴 Model may need additional training")

def main():
    import sys

    print("\n" + "="*80)
    print("GEMMA 2B PSE MODEL TESTER")
    print("="*80)
    print("\nOptions:")
    print("1. Run automated tests")
    print("2. Interactive mode")
    print("3. Evaluate model")
    print("4. Run all")

    if len(sys.argv) > 1:
        choice = sys.argv[1]
    else:
        choice = input("\nSelect option (1-4): ").strip()

    if choice == '1':
        run_tests()
    elif choice == '2':
        interactive_mode()
    elif choice == '3':
        evaluate_model()
    elif choice == '4':
        run_tests()
        print("\n" + "="*80)
        evaluate_model()
        print("\n" + "="*80)
        interactive_mode()
    else:
        print("Invalid choice")

if __name__ == '__main__':
    main()
