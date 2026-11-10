"""
Central configuration for Lingua 语伴.

Change OLLAMA_MODEL here if you want to switch models later
(e.g. to "qwen2.5:3b-instruct" for better quality but slower replies).
"""

import os

# --- Ollama connection -------------------------------------------------
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

# qwen2.5:1.5b-instruct was chosen for 8GB RAM / integrated-graphics laptops.
# It is one of the few small open models with genuinely strong Arabic AND
# Chinese support (most small models are English/Chinese only).
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b-instruct")

# How long to wait for the model before giving up (seconds). CPU-only
# inference on a 1.5B model is usually a few seconds per reply, but the
# very first request after starting Ollama can be slower (model load).
REQUEST_TIMEOUT = 120

# Model sampling settings — kept conservative for accuracy over creativity,
# since this is a language-reference tool, not a creative-writing bot.
MODEL_OPTIONS = {
    "temperature": 0.3,
    "top_p": 0.9,
    "num_ctx": 4096,
}

# --- Server --------------------------------------------------------------
HOST = "127.0.0.1"
PORT = 5050
DEBUG = True
