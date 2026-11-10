"""
Lingua 语伴 — backend server.

Serves the frontend and proxies chat requests to a local Ollama instance,
streaming the model's response back to the browser as it's generated.

Run with:  python app.py
Then open: http://127.0.0.1:5050
"""

import json
import os

import requests
from flask import Flask, Response, jsonify, request, send_from_directory

import config
from system_prompt import SYSTEM_PROMPT
from validator import get_refusal_message, is_on_topic

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")


# ---------------------------------------------------------------------------
# Static frontend
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


# ---------------------------------------------------------------------------
# Health check — lets the frontend confirm Ollama is reachable before chatting
# ---------------------------------------------------------------------------
@app.route("/api/health")
def health():
    try:
        r = requests.get(f"{config.OLLAMA_HOST}/api/tags", timeout=5)
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
        model_ready = any(config.OLLAMA_MODEL in m for m in models)
        return jsonify({
            "ollama_running": True,
            "model_ready": model_ready,
            "configured_model": config.OLLAMA_MODEL,
            "installed_models": models,
        })
    except requests.exceptions.RequestException:
        return jsonify({
            "ollama_running": False,
            "model_ready": False,
            "configured_model": config.OLLAMA_MODEL,
            "installed_models": [],
        })


# ---------------------------------------------------------------------------
# Chat endpoint — streams tokens back to the browser as Server-Sent Events
# ---------------------------------------------------------------------------
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True, silent=True) or {}
    user_message = (data.get("message") or "").strip()
    history = data.get("history", [])  # [{role: "user"|"assistant", content: "..."}]
    ui_language = data.get("ui_language", "en")  # "ar" | "zh" | "en"
    mode = data.get("mode", "chat")  # "translate" | "vocabulary" | "grammar" | "correct" | "chat"

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    # --- Backend validation: block obviously unrelated questions early ---
    if not is_on_topic(user_message):
        refusal = get_refusal_message(ui_language)

        def refusal_stream():
            yield f"data: {json.dumps({'token': refusal})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

        return Response(refusal_stream(), mimetype="text/event-stream")

    # --- Build the message list for the model ---
    mode_hint = {
        "translate": "The user wants a TRANSLATION. Give the translation clearly, "
                     "and briefly note any tricky word choices.",
        "vocabulary": "The user wants a VOCABULARY explanation. Follow the required "
                      "format: 汉字 (Pīnyīn) — المعنى بالعربية, with an example sentence.",
        "grammar": "The user wants a GRAMMAR explanation. Explain the rule simply, "
                   "then give at least one example sentence in context.",
        "correct": "The user wants SENTENCE CORRECTION. Point out what's wrong, "
                   "explain why, and give the corrected sentence.",
        "chat": "",
    }.get(mode, "")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if mode_hint:
        messages.append({"role": "system", "content": mode_hint})
    messages.extend(history[-12:])  # keep recent context only, small model has limited context
    messages.append({"role": "user", "content": user_message})

    ollama_payload = {
        "model": config.OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "options": config.MODEL_OPTIONS,
    }

    def generate():
        try:
            with requests.post(
                f"{config.OLLAMA_HOST}/api/chat",
                json=ollama_payload,
                stream=True,
                timeout=config.REQUEST_TIMEOUT,
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line.decode("utf-8"))
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield f"data: {json.dumps({'token': token})}\n\n"
                    if chunk.get("done"):
                        yield f"data: {json.dumps({'done': True})}\n\n"
                        break
        except requests.exceptions.ConnectionError:
            err = ("Can't reach Ollama. Make sure it's running (open a terminal and run "
                   "'ollama serve', or just open the Ollama app) and that you've pulled "
                   f"the model with: ollama pull {config.OLLAMA_MODEL}")
            yield f"data: {json.dumps({'error': err})}\n\n"
        except requests.exceptions.Timeout:
            yield f"data: {json.dumps({'error': 'The model took too long to respond. Try again.'})}\n\n"
        except Exception as e:  # noqa: BLE001
            yield f"data: {json.dumps({'error': f'Unexpected error: {str(e)}'})}\n\n"

    return Response(generate(), mimetype="text/event-stream")


if __name__ == "__main__":
    print(f"\n  Lingua 语伴 backend running at http://{config.HOST}:{config.PORT}")
    print(f"  Using Ollama model: {config.OLLAMA_MODEL}\n")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
