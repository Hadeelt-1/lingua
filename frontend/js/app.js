/* =========================================================
   Lingua 语伴 — frontend application logic
   Plain JS, no build step. Chat history is kept in
   localStorage so there's no database to set up.
   ========================================================= */

const API_BASE = ""; // same origin as the Flask server

// ---------------------------------------------------------
// State
// ---------------------------------------------------------
const state = {
  uiLanguage: localStorage.getItem("lingua_ui_lang") || "en",
  mode: "chat",
  direction: "ar-zh", // ar-zh = Arabic -> Chinese, zh-ar = Chinese -> Arabic
  conversations: loadConversations(),
  activeId: null,
  streaming: false,
};

const UI_STRINGS = {
  en: {
    subtitle: "Your companion for Arabic and Chinese — translation, vocabulary, grammar, and correction.",
    placeholder: "Ask about translation, vocabulary, grammar…",
    hint: "Lingua 语伴 only answers Arabic ⇄ Chinese language questions.",
    newChat: "New conversation",
    history: "History",
    noHistory: "Your conversations will appear here.",
  },
  ar: {
    subtitle: "رفيقك في تعلم العربية والصينية — ترجمة، مفردات، قواعد، وتصحيح.",
    placeholder: "اسأل عن ترجمة أو مفردة أو قاعدة نحوية…",
    hint: "Lingua 语伴 يجيب فقط عن أسئلة اللغتين العربية والصينية.",
    newChat: "محادثة جديدة",
    history: "السجل",
    noHistory: "ستظهر محادثاتك هنا.",
  },
  zh: {
    subtitle: "您的中文与阿拉伯语学习伙伴 — 翻译、词汇、语法与纠错。",
    placeholder: "询问翻译、词汇或语法问题…",
    hint: "Lingua 语伴 只回答有关中文和阿拉伯语的问题。",
    newChat: "新对话",
    history: "历史记录",
    noHistory: "您的对话记录将显示在这里。",
  },
};

// ---------------------------------------------------------
// DOM references
// ---------------------------------------------------------
const el = {
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  collapseSidebarBtn: document.getElementById("collapseSidebarBtn"),
  openSidebarBtn: document.getElementById("openSidebarBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  historyList: document.getElementById("historyList"),
  historyLabel: document.querySelector(".history-label"),
  uiLangToggle: document.getElementById("uiLangToggle"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  directionToggle: document.getElementById("directionToggle"),
  dirSwitchBtn: document.getElementById("dirSwitchBtn"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  welcomeSubtitle: document.getElementById("welcomeSubtitle"),
  chatView: document.getElementById("chatView"),
  messages: document.getElementById("messages"),
  modeChips: document.getElementById("modeChips"),
  composerModes: document.getElementById("composerModes"),
  suggestions: document.getElementById("suggestions"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  composerHint: document.getElementById("composerHint"),
};

// ---------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------
function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem("lingua_conversations") || "[]");
  } catch {
    return [];
  }
}
function saveConversations() {
  localStorage.setItem("lingua_conversations", JSON.stringify(state.conversations));
}

// ---------------------------------------------------------
// Script detection (for per-bubble font/direction)
// ---------------------------------------------------------
function detectDirAndFont(text) {
  const arabic = /[\u0600-\u06FF]/.test(text);
  const cjk = /[\u4E00-\u9FFF]/.test(text);
  if (arabic && !cjk) return "rtl";
  return "auto";
}

// ---------------------------------------------------------
// Rendering
// ---------------------------------------------------------
function renderHistory() {
  el.historyList.innerHTML = "";
  if (state.conversations.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = UI_STRINGS[state.uiLanguage].noHistory;
    el.historyList.appendChild(empty);
    return;
  }
  [...state.conversations].reverse().forEach((conv) => {
    const item = document.createElement("div");
    item.className = "history-item" + (conv.id === state.activeId ? " active" : "");
    item.textContent = conv.title || "Untitled";
    item.addEventListener("click", () => openConversation(conv.id));
    el.historyList.appendChild(item);
  });
}

function renderMessages() {
  const conv = getActiveConversation();
  el.messages.innerHTML = "";
  if (!conv || conv.messages.length === 0) {
    el.welcomeScreen.hidden = false;
    el.chatView.hidden = true;
    return;
  }
  el.welcomeScreen.hidden = true;
  el.chatView.hidden = false;
  conv.messages.forEach((m) => appendMessageBubble(m.role, m.content));
  el.chatView.scrollTop = el.chatView.scrollHeight;
}

function appendMessageBubble(role, content) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "bot");

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "user" ? "" : "语";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  const dir = detectDirAndFont(content);
  if (dir === "rtl") bubble.setAttribute("dir", "rtl");
  bubble.textContent = content;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  el.messages.appendChild(wrap);
  el.chatView.scrollTop = el.chatView.scrollHeight;
  return bubble;
}

function applyUiLanguage() {
  const strings = UI_STRINGS[state.uiLanguage];
  document.body.classList.toggle("ui-ar", state.uiLanguage === "ar");
  el.welcomeSubtitle.textContent = strings.subtitle;
  el.messageInput.placeholder = strings.placeholder;
  el.composerHint.textContent = strings.hint;
  el.newChatBtn.querySelector("span").textContent = strings.newChat;
  el.historyLabel.textContent = strings.history;
  renderHistory();

  el.uiLangToggle.querySelectorAll(".lang-opt").forEach((btn) => {
    const active = btn.dataset.lang === state.uiLanguage;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

// ---------------------------------------------------------
// Conversation management
// ---------------------------------------------------------
function getActiveConversation() {
  return state.conversations.find((c) => c.id === state.activeId) || null;
}

function createConversation() {
  const conv = { id: "c" + Date.now(), title: "", messages: [] };
  state.conversations.push(conv);
  state.activeId = conv.id;
  saveConversations();
  renderHistory();
  renderMessages();
}

function openConversation(id) {
  state.activeId = id;
  renderHistory();
  renderMessages();
  if (window.innerWidth <= 860) closeMobileSidebar();
}

function ensureActiveConversation() {
  if (!getActiveConversation()) createConversation();
}

// ---------------------------------------------------------
// Mode + direction toggles
// ---------------------------------------------------------
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".chip[data-mode]").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.mode === mode);
  });
}

el.modeChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) setMode(chip.dataset.mode);
});
el.composerModes.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) setMode(chip.dataset.mode);
});

el.dirSwitchBtn.addEventListener("click", () => {
  state.direction = state.direction === "ar-zh" ? "zh-ar" : "ar-zh";
  el.directionToggle.classList.toggle("flipped");
  const arLabel = el.directionToggle.querySelector(".dir-ar");
  const zhLabel = el.directionToggle.querySelector(".dir-zh");
  el.directionToggle.insertBefore(
    state.direction === "ar-zh" ? arLabel : zhLabel,
    el.dirSwitchBtn
  );
});

// ---------------------------------------------------------
// UI language toggle
// ---------------------------------------------------------
el.uiLangToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-opt");
  if (!btn) return;
  state.uiLanguage = btn.dataset.lang;
  localStorage.setItem("lingua_ui_lang", state.uiLanguage);
  applyUiLanguage();
});

// ---------------------------------------------------------
// Sidebar (mobile + collapse)
// ---------------------------------------------------------
el.collapseSidebarBtn.addEventListener("click", () => {
  el.sidebar.classList.toggle("collapsed");
});
el.openSidebarBtn.addEventListener("click", () => {
  el.sidebar.classList.add("open");
  el.sidebarOverlay.classList.add("show");
});
el.sidebarOverlay.addEventListener("click", closeMobileSidebar);
function closeMobileSidebar() {
  el.sidebar.classList.remove("open");
  el.sidebarOverlay.classList.remove("show");
}

el.newChatBtn.addEventListener("click", () => {
  createConversation();
  if (window.innerWidth <= 860) closeMobileSidebar();
});

// ---------------------------------------------------------
// Suggestions (welcome screen)
// ---------------------------------------------------------
el.suggestions.addEventListener("click", (e) => {
  const card = e.target.closest(".suggestion-card");
  if (!card) return;
  el.messageInput.value = card.dataset.prompt;
  sendMessage();
});

// ---------------------------------------------------------
// Composer: autosize + send
// ---------------------------------------------------------
el.messageInput.addEventListener("input", () => {
  el.messageInput.style.height = "auto";
  el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 160) + "px";
});
el.messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
el.sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text || state.streaming) return;

  ensureActiveConversation();
  const conv = getActiveConversation();

  if (!conv.title) conv.title = text.slice(0, 40);
  conv.messages.push({ role: "user", content: text });
  saveConversations();
  renderHistory();

  el.welcomeScreen.hidden = true;
  el.chatView.hidden = false;
  appendMessageBubble("user", text);

  el.messageInput.value = "";
  el.messageInput.style.height = "auto";

  const botBubble = appendMessageBubble("assistant", "");
  botBubble.innerHTML = '<span class="typing-cursor"></span>';

  setStreaming(true);

  const history = conv.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

  let fullReply = "";
  try {
    const resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history,
        ui_language: state.uiLanguage,
        mode: state.mode,
        direction: state.direction,
      }),
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // keep incomplete chunk in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6));
        if (payload.error) {
          fullReply += `\n⚠️ ${payload.error}`;
          botBubble.textContent = fullReply.trim();
          botBubble.classList.add("msg-error");
        } else if (payload.token) {
          fullReply += payload.token;
          botBubble.textContent = fullReply;
          const dir = detectDirAndFont(fullReply);
          if (dir === "rtl") botBubble.setAttribute("dir", "rtl");
          el.chatView.scrollTop = el.chatView.scrollHeight;
        }
      }
    }
  } catch (err) {
    fullReply = "⚠️ Could not reach the backend server. Is app.py running?";
    botBubble.textContent = fullReply;
    botBubble.classList.add("msg-error");
  }

  conv.messages.push({ role: "assistant", content: fullReply.trim() });
  saveConversations();
  setStreaming(false);
}

function setStreaming(isStreaming) {
  state.streaming = isStreaming;
  el.sendBtn.disabled = isStreaming;
}

// ---------------------------------------------------------
// Health check
// ---------------------------------------------------------
async function checkHealth() {
  try {
    const resp = await fetch(`${API_BASE}/api/health`);
    const data = await resp.json();
    if (data.ollama_running && data.model_ready) {
      el.statusDot.className = "status-dot ok";
      el.statusText.textContent = data.configured_model;
    } else if (data.ollama_running && !data.model_ready) {
      el.statusDot.className = "status-dot bad";
      el.statusText.textContent = "Model not pulled";
    } else {
      el.statusDot.className = "status-dot bad";
      el.statusText.textContent = "Ollama not running";
    }
  } catch {
    el.statusDot.className = "status-dot bad";
    el.statusText.textContent = "Backend offline";
  }
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
applyUiLanguage();
renderHistory();
renderMessages();
checkHealth();
setInterval(checkHealth, 15000);
