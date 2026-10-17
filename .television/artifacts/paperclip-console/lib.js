// Shared helpers for the Paperclip console: DOM builder, formatting, bridge calls.
// All values are inserted as text nodes; no HTML strings are parsed.

export const BRIDGE = "http://127.0.0.1:3199";
const TOAST_MS = 4000;
const PILL = { idle: "idle", running: "ok", active: "ok", succeeded: "ok", done: "ok", error: "bad",
  failed: "bad", blocked: "bad", terminated: "bad", timed_out: "bad", paused: "warn", in_progress: "warn",
  in_review: "warn", pending: "warn", cancelled: "idle" };

export const $ = (id) => document.getElementById(id);
export const label = (s) => String(s ?? "").replace(/[._]/g, " ");
export const cap = (s) => label(s).replace(/^./, (c) => c.toUpperCase());

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v; else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const pill = (s) => el("span", { class: `pill ${PILL[s] || "idle"}` }, label(s));

export function ago(iso) {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

export function button(text, onClick, extra = {}) {
  const b = el("button", { type: "button", ...extra }, text);
  b.addEventListener("click", () => onClick(b));
  return b;
}

let toastTimer;
export function toast(message, isError = false) {
  const t = $("toast");
  t.textContent = message;
  t.className = isError ? "toast err" : "toast";
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, TOAST_MS);
}

export async function getJSON(path) {
  const res = await fetch(`${BRIDGE}${path}`);
  return res.json();
}

export async function act(payload, okMessage, afterOk) {
  try {
    const res = await fetch(`${BRIDGE}/act`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-TV-Console": "1" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
    toast(okMessage);
    if (afterOk) await afterOk();
    return true;
  } catch (err) {
    toast(`Failed: ${err.message}`, true);
    return false;
  }
}

// Fill a <tv-select> with options ([{value, label}]) and select `value` (falls back to the first option).
// Programmatic selection does not emit "change", so callers never see a write from this.
export function setSelect(select, options, value) {
  const wanted = options.some((o) => o.value === value) ? value : options[0]?.value;
  select.replaceChildren(...options.map((o) => {
    const node = el("tv-option", { value: o.value }, o.label);
    if (o.value === wanted) node.setAttribute("selected", "");
    return node;
  }));
  if (wanted !== undefined) select.value = wanted;
}

// Saved-view storage. localStorage throws inside sandboxed artifact frames, so every
// access is guarded; `mode` tells the UI which kind of persistence it actually got.
export const prefs = {
  mode: "memory",
  load(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      this.mode = "browser";
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      this.mode = "memory";
      return fallback;
    }
  },
  save(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      this.mode = "browser";
    } catch {
      this.mode = "memory";
    }
  },
};

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
