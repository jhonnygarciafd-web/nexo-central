(() => {
  "use strict";

  const STORAGE_KEY = "nexo.conversation.v1";
  const MAX_STORED_MESSAGES = 200;

  // ---------------------------------------------------------------------
  // Memória local — pronta para ser trocada por um backend/banco de dados
  // sem alterar o restante da aplicação.
  // ---------------------------------------------------------------------
  function saveConversation(messages) {
    try {
      const trimmed = messages.slice(-MAX_STORED_MESSAGES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (_err) {
      // Armazenamento indisponível (modo privado, quota etc.) — falha silenciosa.
    }
  }

  function loadConversation() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function clearConversation() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_err) {
      /* noop */
    }
  }

  // ---------------------------------------------------------------------
  // Navegação entre seções
  // ---------------------------------------------------------------------
  function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const views = document.querySelectorAll(".view");
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    const navToggle = document.getElementById("navToggle");

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      scrim.classList.remove("is-open");
    }

    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const target = item.getAttribute("data-view");

        navItems.forEach((n) => n.classList.toggle("is-active", n === item));
        views.forEach((v) => v.classList.toggle("is-active", v.id === `view-${target}`));
        closeSidebar();
      });
    });

    navToggle.addEventListener("click", () => {
      sidebar.classList.add("is-open");
      scrim.classList.add("is-open");
    });
    scrim.addEventListener("click", closeSidebar);
  }

  // ---------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------
  function renderMessage(chatLog, role, text, opts = {}) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role === "user" ? "msg-user" : "msg-nexo"}`;

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    if (opts.pending) bubble.classList.add("is-pending");
    if (opts.error) bubble.classList.add("is-error");
    bubble.textContent = text;

    wrap.appendChild(bubble);
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
    return bubble;
  }

  function initChat() {
    const chatLog = document.getElementById("chatLog");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatSend = document.getElementById("chatSend");

    let history = loadConversation();

    if (history.length > 0) {
      chatLog.innerHTML = "";
      history.forEach((m) => renderMessage(chatLog, m.role, m.content));
    }

    function autoresize() {
      chatInput.style.height = "auto";
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
    }

    chatInput.addEventListener("input", autoresize);

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
      }
    });

    async function sendMessage(text) {
      history.push({ role: "user", content: text });
      saveConversation(history);
      renderMessage(chatLog, "user", text);

      chatInput.value = "";
      autoresize();
      chatSend.disabled = true;

      const pendingBubble = renderMessage(chatLog, "assistant", "Processando…", { pending: true });

      try {
        const response = await fetch("/api/nexo-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-20) }),
        });

        const data = await response.json();

        if (!response.ok) {
          pendingBubble.textContent = data.error || "Não foi possível obter resposta do NEXO.";
          pendingBubble.classList.add("is-error");
          pendingBubble.classList.remove("is-pending");
          return;
        }

        if (data.status === "awaiting_configuration") {
          pendingBubble.textContent = "Motor de IA aguardando configuração.";
          pendingBubble.classList.remove("is-pending");
          return;
        }

        pendingBubble.textContent = data.reply;
        pendingBubble.classList.remove("is-pending");

        history.push({ role: "assistant", content: data.reply });
        saveConversation(history);
      } catch (_err) {
        pendingBubble.textContent = "Falha de conexão com o NEXO. Tente novamente.";
        pendingBubble.classList.add("is-error");
        pendingBubble.classList.remove("is-pending");
      } finally {
        chatSend.disabled = false;
        chatInput.focus();
      }
    }

    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      sendMessage(text);
    });

    document.getElementById("btnClearConversation").addEventListener("click", () => {
      history = [];
      clearConversation();
      chatLog.innerHTML = "";
      renderMessage(chatLog, "assistant", "Olá. O que vamos fazer?");
    });
  }

  // ---------------------------------------------------------------------
  // Status do motor de IA
  // ---------------------------------------------------------------------
  async function initStatus() {
    const engineStatusEl = document.getElementById("settingsEngineStatus");
    try {
      const res = await fetch("/api/nexo-status");
      const data = await res.json();
      const configured = Boolean(data.configured);

      engineStatusEl.textContent = configured ? "Configurado" : "Aguardando configuração";
      engineStatusEl.classList.toggle("tag-muted", !configured);
    } catch (_err) {
      engineStatusEl.textContent = "Indisponível";
      engineStatusEl.classList.add("tag-muted");
    }
  }

  // ---------------------------------------------------------------------
  // PWA
  // ---------------------------------------------------------------------
  function initServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* PWA é um extra — falha não deve afetar o app */
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initChat();
    initStatus();
    initServiceWorker();
  });
})();
