const API_BASE = "/v1";

const thread = document.getElementById("thread");
const form = document.getElementById("composer");
const input = document.getElementById("message");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");

/** @type {{ sessionId: string | null, continuationToken: string | null, streamIndex: number }} */
const state = {
  sessionId: null,
  continuationToken: null,
  streamIndex: 0,
};

let busy = false;
/** @type {AbortController | null} */
let streamAbort = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("is-error", isError);
}

function addBubble(role, text) {
  const el = document.createElement("div");
  el.className = `bubble ${role}`;
  el.textContent = text;
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
  return el;
}

function addTyping() {
  const el = document.createElement("div");
  el.className = "bubble assistant";
  el.dataset.typing = "1";
  el.innerHTML = '<div class="typing" aria-label="تكتب…"><span></span><span></span><span></span></div>';
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
  return el;
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
}

input.addEventListener("input", resizeInput);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

/**
 * @param {string} message
 */
async function startOrContinue(message) {
  const body = state.sessionId
    ? {
        message,
        continuationToken: state.continuationToken,
      }
    : { message, title: "محادثة Kayla" };

  const url = state.sessionId
    ? `${API_BASE}/session/${encodeURIComponent(state.sessionId)}`
    : `${API_BASE}/session`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const detail =
      data.message ||
      data.error ||
      (res.status === 502
        ? "السيرفر غير متاح. شغّلي `npm run dev` ثم أعيدي المحاولة."
        : `تعذّر الإرسال (${res.status})`);
    throw new Error(detail);
  }

  state.sessionId = data.sessionId ?? state.sessionId;
  if (data.continuationToken) {
    state.continuationToken = data.continuationToken;
  }
  return data;
}

/**
 * @param {HTMLElement} bubble
 */
async function listenStream(bubble) {
  if (!state.sessionId) return;

  streamAbort?.abort();
  streamAbort = new AbortController();

  const url = `${API_BASE}/session/${encodeURIComponent(state.sessionId)}/stream?startIndex=${state.streamIndex}`;
  const res = await fetch(url, { signal: streamAbort.signal });
  if (!res.ok || !res.body) {
    throw new Error("تعذّر الاتصال ببث الرد.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let sawAssistant = false;
  let turnDone = false;
  let turnError = "";

  while (!turnDone) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (typeof event.index === "number") {
        state.streamIndex = Math.max(state.streamIndex, event.index + 1);
      }

      const type = event.type;
      const data = event.data ?? {};

      if (type === "message.appended" && typeof data.text === "string") {
        if (!sawAssistant) {
          bubble.textContent = "";
          sawAssistant = true;
        }
        text += data.text;
        bubble.textContent = text;
        thread.scrollTop = thread.scrollHeight;
      }

      if (type === "message.completed" && typeof data.text === "string") {
        if (data.finishReason === "tool_call") continue;
        text = data.text || text;
        if (text) {
          bubble.textContent = text;
          sawAssistant = true;
        }
      }

      if (type === "actions.requested" && Array.isArray(data.calls)) {
        for (const call of data.calls) {
          const name = call.toolName || "أداة";
          const label =
            name === "save_note"
              ? "حفظ ملاحظة…"
              : name === "recall_note"
                ? "استرجاع ملاحظة…"
                : `تشغيل ${name}…`;
          addBubble("tool", label);
        }
      }

      if (type === "turn.failed") {
        turnError = data.message || "فشلت الجولة.";
        turnDone = true;
      }

      if (type === "turn.completed" || type === "session.waiting") {
        turnDone = true;
      }
    }
  }

  reader.cancel().catch(() => {});

  if (turnError) {
    throw new Error(humanizeAgentError(turnError));
  }

  if (!sawAssistant || !text.trim()) {
    bubble.remove();
  }
}

function humanizeAgentError(raw) {
  if (/CURSOR_API_KEY|bdk login|credential/i.test(raw)) {
    return "يحتاج الرد مفتاح Cursor. نفّذي `npx @cursor/bdk@0.2.24 login` داخل مجلد kayla ثم أعيدي المحاولة.";
  }
  return raw;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || busy) return;

  busy = true;
  sendBtn.disabled = true;
  setStatus("");
  addBubble("user", message);
  input.value = "";
  resizeInput();

  const typing = addTyping();

  try {
    await startOrContinue(message);
    await listenStream(typing);
    setStatus(state.sessionId ? `جلسة ${state.sessionId.slice(0, 12)}…` : "");
  } catch (err) {
    typing.remove();
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    addBubble("error", msg);
    setStatus(msg, true);
  } finally {
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }
});

async function probe() {
  try {
    const res = await fetch(`${API_BASE}/info`);
    if (!res.ok) throw new Error("offline");
    setStatus("متصلة بالوكيل");
  } catch {
    setStatus(
      "الوكيل غير متصل — شغّلي `npm run dev` في طرفية، و`npm run ui` في أخرى.",
      true,
    );
  }
}

probe();
input.focus();
