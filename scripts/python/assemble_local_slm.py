#!/usr/bin/env python3
"""
assemble_local_slm.py — StockEX Local SLM Assembly and Registration.
Verifies LoRA adapter integrity, then registers the model with Ollama.
"""

import os
import sys
import json
import subprocess

ADAPTER_DIR = "./stockex_slm_agent_output"
MODELFILE_PATH = "./Modelfile"
MODEL_NAME = "stockstory-slm"


def compile_and_register_local_slm():
    print("Starting StockEX Local SLM Assembly and Compilation Lifecycle...")

    config_path = os.path.join(ADAPTER_DIR, "adapter_config.json")
    weights_path = os.path.join(ADAPTER_DIR, "adapter_model.safetensors")

    if not os.path.exists(config_path) or not os.path.exists(weights_path):
        print(f"Assembly Aborted: Missing required LoRA weight records inside {ADAPTER_DIR}")
        sys.exit(1)

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        print(f"   LoRA Alpha: {meta.get('lora_alpha')}")
        print(f"   Target Modules: {meta.get('target_modules')}")
        print(f"   Model Type: {meta.get('model_type')}")
        print(f"   Base Model: {meta.get('base_model_name_or_path')}")

        print(f"   Registering compiled model footprint '{MODEL_NAME}' into Ollama daemon rings...")
        result = subprocess.run(
            ["ollama", "create", MODEL_NAME, "-f", MODELFILE_PATH],
            capture_output=True, text=True, check=True
        )

        print(result.stdout)
        print(f"Success! Fine-tuned local model '{MODEL_NAME}' is now fully active for zero-cost inference loops.")
        sys.exit(0)

    except subprocess.CalledProcessError as e:
        print(f"Ollama creation routine failed: {e.stderr}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during model compilation pass: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    compile_and_register_local_slm()
