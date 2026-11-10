# Lingua 语伴 — Arabic ⇄ Chinese Local AI Chatbot

A fully local, private Arabic-Chinese language assistant. No cloud APIs, no
API keys, no subscription — everything runs on your own laptop using
[Ollama](https://ollama.com).

It helps with:
- **Translation** between Arabic and Chinese
- **Vocabulary** explanations (Chinese characters + Pinyin + Arabic meaning)
- **Grammar** explanations for both languages
- **Sentence correction**
- General Arabic/Chinese language questions

It refuses to answer anything unrelated to these two languages — both via a
strict system prompt and a backend keyword filter.

---

## 1. Install Ollama

1. Download Ollama for Windows: https://ollama.com/download
2. Run the installer. Once installed, Ollama runs quietly in the background
   (you'll see its icon in the system tray) and exposes a local API at
   `http://localhost:11434`.
3. Open a terminal (Command Prompt or PowerShell) and confirm it works:
   ```
   ollama --version
   ```

## 2. Download the language model

This project is configured for **`qwen2.5:1.5b-instruct`** — chosen because
it's small enough to run comfortably on an 8GB RAM laptop with integrated
graphics, while still having genuinely strong Arabic *and* Chinese ability
(most small models only do Chinese well, not Arabic).

Pull it with:
```
ollama pull qwen2.5:1.5b-instruct
```
This downloads roughly 1GB. Keep Ollama running after this — the backend
talks to it automatically.

> **Want better quality and don't mind slower replies?**
> Run `ollama pull qwen2.5:3b-instruct` instead, then open
> `backend/config.py` and change `OLLAMA_MODEL` to `"qwen2.5:3b-instruct"`.

## 3. Install Python

You need Python 3.9+. Check with:
```
python --version
```
If you don't have it: https://www.python.org/downloads/ (tick "Add Python
to PATH" during install).

## 4. Run the project

**Windows:** double-click `start_windows.bat`
(or run it from a terminal: `start_windows.bat`)

**Mac/Linux:** `./start_mac_linux.sh`

This will:
1. Create a Python virtual environment in `backend/venv` (first run only)
2. Install Flask + requests
3. Start the backend server

Then open your browser to **http://127.0.0.1:5050**

The sidebar shows a status dot — green means Ollama and the model are ready.
If it's red, make sure Ollama is running and you've pulled the model (step 2).

---

## Project structure

```
lingua/
├── backend/
│   ├── app.py            # Flask server — chat endpoint, streams Ollama's reply
│   ├── config.py         # Model name, Ollama host, server settings
│   ├── system_prompt.py  # The chatbot's personality & scope rules — EDIT THIS to change behavior
│   ├── validator.py       # Keyword-based filter that blocks obviously off-topic questions
│   └── requirements.txt
├── frontend/
│   ├── index.html        # Page structure: sidebar, welcome screen, chat, composer
│   ├── css/style.css     # The dark-purple / Chinese-inspired theme
│   └── js/app.js         # All UI logic: chat streaming, history, language toggle
├── start_windows.bat
├── start_mac_linux.sh
└── README.md
```

No build tools, no frameworks, no bundler — every file is plain and can be
opened directly in VS Code and edited.

---

## How it works

1. You type a message in the browser.
2. The frontend (`app.js`) sends it to the Flask backend (`app.py`).
3. `validator.py` does a quick local check — if the message is obviously
   unrelated to Arabic/Chinese (e.g. "write me Python code"), it's rejected
   immediately without even calling the model, and a polite refusal is sent
   back.
4. If it passes, the backend adds the system prompt from `system_prompt.py`
   plus recent chat history, and sends it to Ollama's local API.
5. Ollama streams the reply back token-by-token, which the backend relays
   to the browser so you see the answer appear live.
6. Chat history is saved in your browser's local storage — nothing leaves
   your machine, ever.

---

## Customizing

**Change the chatbot's rules or personality** → edit
`backend/system_prompt.py`. This is plain English text describing what the
bot should and shouldn't do — just rewrite it.

**Adjust what counts as "off-topic"** → edit the keyword lists in
`backend/validator.py`.

**Change colors/theme** → edit the `:root` CSS variables at the top of
`frontend/css/style.css` (e.g. `--accent`, `--seal`, `--gold`).

**Add more suggested prompts** → edit the `.suggestion-card` buttons inside
`frontend/index.html`.

**Switch models** → change `OLLAMA_MODEL` in `backend/config.py` to any
model you've pulled with `ollama pull <name>`.

---

## Troubleshooting

- **"Ollama not running" (red dot)** — open a terminal and run
  `ollama serve`, or make sure the Ollama app/tray icon is running.
- **"Model not pulled"** — run `ollama pull qwen2.5:1.5b-instruct`.
- **Replies are slow** — normal on CPU-only laptops; the first message after
  starting Ollama is slowest (loading the model into memory). If it's too
  slow, this is still the smallest capable model for 8GB RAM — avoid
  switching to a bigger model.
- **Port 5050 already in use** — change `PORT` in `backend/config.py`.
