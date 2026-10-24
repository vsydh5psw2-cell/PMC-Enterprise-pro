const API_BASE = "/v1";

const thread = document.getElementById("thread");
const form = document.getElementById("composer");
const input = document.getElementById("message");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");

/** @type {{ sessionId: string | null, continuationToken: string | null, seenIndex: number }} */
const state = {
  sessionId: null,
  continuationToken: null,
  seenIndex: -1,
};

let busy = false;

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
  el.innerHTML =
    '<div class="typing" aria-label="تكتب…"><span></span><span></span><span></span></div>';
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

function httpErrorMessage(status, data) {
  if (data?.message) return data.message;
  if (data?.error) return String(data.error);
  if (status === 530 || status === 502 || status === 504) {
    return "انقطع الاتصال مؤقتاً. انتظري ثانية وأعيدي الإرسال.";
  }
  if (status === 0) return "Load failed — تحققي من الشبكة وأعيدي المحاولة.";
  return `تعذّر الإرسال (${status})`;
}

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
    throw new Error(httpErrorMessage(res.status, data));
  }

  state.sessionId = data.sessionId ?? state.sessionId;
  if (data.continuationToken) {
    state.continuationToken = data.continuationToken;
  }
  return data;
}

async function fetchEvents() {
  const url = `${API_BASE}/session/${encodeURIComponent(state.sessionId)}/events?format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(httpErrorMessage(res.status, await res.json().catch(() => ({}))));
  }
  const data = await res.json();
  return Array.isArray(data.events) ? data.events : [];
}

/**
 * Poll session events — more reliable than long SSE through mobile tunnels.
 * @param {HTMLElement} bubble
 */
async function waitForReply(bubble) {
  if (!state.sessionId) return;

  let text = "";
  let sawAssistant = false;
  let turnError = "";
  const shownTools = new Set();
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    const events = await fetchEvents();

    for (const event of events) {
      if (typeof event.index !== "number" || event.index <= state.seenIndex) {
        continue;
      }
      state.seenIndex = event.index;

      const type = event.type;
      const data = event.data ?? {};

      if (type === "message.appended" && typeof data.text === "string") {
        if (!sawAssistant) {
          bubble.textContent = "";
          sawAssistant = true;
        }
        // events dump is cumulative per message; prefer completed text when present
        if (data.delta) {
          text += data.delta;
        } else if (data.text && data.text.length >= text.length) {
          text = data.text;
        } else {
          text += data.text;
        }
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
          const id = call.callId || call.toolName;
          if (shownTools.has(id)) continue;
          shownTools.add(id);
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
      }

      if (
        type === "turn.completed" ||
        type === "session.waiting" ||
        type === "turn.failed"
      ) {
        if (turnError) throw new Error(humanizeAgentError(turnError));
        if (!sawAssistant || !text.trim()) bubble.remove();
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 450));
  }

  throw new Error("انتهى وقت انتظار الرد. أعيدي المحاولة.");
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
  setStatus("جارٍ الإرسال…");
  addBubble("user", message);
  input.value = "";
  resizeInput();

  const typing = addTyping();

  try {
    await startOrContinue(message);
    setStatus("Kayla ترد…");
    await waitForReply(typing);
    setStatus("متصلة");
  } catch (err) {
    typing.remove();
    const msg =
      err instanceof TypeError
        ? "Load failed — انقطع الاتصال. أعيدي المحاولة."
        : err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع.";
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
    setStatus("متصلة — جاهزة على الموبايل");
  } catch {
    setStatus("غير متصلة الآن. أعيدي تحميل الصفحة بعد لحظات.", true);
  }
}

probe();
input.focus();
