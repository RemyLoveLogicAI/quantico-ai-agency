// Interactive Paperclip console. Talks only to the local bridge (bridge.py).
// All values are inserted as text nodes; no HTML strings are parsed.

const BRIDGE = "http://127.0.0.1:3199";
const POLL_MS = 10000;
const TOAST_MS = 4000;
const STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"];
const PILL = { idle: "idle", running: "ok", active: "ok", succeeded: "ok", done: "ok", error: "bad",
  failed: "bad", blocked: "bad", paused: "warn", in_progress: "warn", pending: "warn" };

const $ = (id) => document.getElementById(id);
const pill = (s) => el("span", { class: `pill ${PILL[s] || "idle"}` }, String(s).replace(/_/g, " "));

function el(tag, props = {}, ...children) {
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

function ago(iso) {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

let toastTimer;
function toast(message, isError = false) {
  const t = $("toast");
  t.textContent = message;
  t.className = isError ? "toast err" : "toast";
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, TOAST_MS);
}

async function act(payload, okMessage) {
  try {
    const res = await fetch(`${BRIDGE}/act`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-TV-Console": "1" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
    toast(okMessage);
    await refresh();
    return true;
  } catch (err) {
    toast(`Failed: ${err.message}`, true);
    return false;
  }
}

function button(label, onClick, extra = {}) {
  const b = el("button", { type: "button", ...extra }, label);
  b.addEventListener("click", () => onClick(b));
  return b;
}

function renderAgents(agents) {
  $("agents-body").replaceChildren(...agents.map((a) => el("div", { class: "card" },
    el("div", { class: "line" }, el("span", { class: "grow" }, a.name), pill(a.status)),
    el("div", { class: "muted" }, `${a.role || "agent"} · ${a.adapterType} · heartbeat ${ago(a.lastHeartbeatAt)}`),
    el("div", { class: "line" },
      button("Wake now", () => act({ action: "agent.wake", id: a.id }, `Woke ${a.name}`)),
      a.status === "paused"
        ? button("Resume", () => act({ action: "agent.resume", id: a.id }, `Resumed ${a.name}`))
        : button("Pause", () => act({ action: "agent.pause", id: a.id }, `Paused ${a.name}`))))));
  const select = $("n-agent");
  const keep = select.value;
  select.replaceChildren(el("option", { value: "" }, "Unassigned"),
    ...agents.map((a) => el("option", { value: a.id }, a.name)));
  select.value = keep;
}

function renderTasks(issues) {
  if (!issues.length) { $("tasks-body").replaceChildren(el("p", { class: "muted" }, "No tasks yet.")); return; }
  $("tasks-body").replaceChildren(...issues.map((i) => {
    const status = el("select", { "aria-label": `Status of ${i.identifier}` },
      ...STATUSES.map((s) => el("option", { value: s }, s.replace(/_/g, " "))));
    status.value = i.status;
    status.addEventListener("change", () => act({ action: "issue.status", id: i.id, status: status.value },
      `${i.identifier} → ${status.value.replace(/_/g, " ")}`));
    const note = el("input", { placeholder: "Add a comment…", "aria-label": `Comment on ${i.identifier}` });
    const send = async () => {
      if (!note.value.trim()) return;
      if (await act({ action: "issue.comment", id: i.id, body: note.value }, `Commented on ${i.identifier}`)) note.value = "";
    };
    note.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    return el("div", { class: "card" },
      el("div", { class: "line" }, el("span", { class: "muted" }, i.identifier), el("span", { class: "grow" }, i.title), status),
      el("div", { class: "muted" }, `${i.priority || "—"} · ${i.assignee || "unassigned"} · updated ${ago(i.updatedAt)}`),
      el("div", { class: "comment" }, note, button("Send", send)));
  }));
}

function renderApprovals(list) {
  $("approvals").hidden = !list.length;
  $("approvals-body").replaceChildren(...list.map((a) => el("div", { class: "card" },
    el("div", { class: "line" }, el("span", { class: "grow" }, a.type || "approval"), el("span", { class: "muted" }, ago(a.createdAt))),
    el("div", { class: "line" },
      button("Approve", () => act({ action: "approval.approve", id: a.id }, "Approved")),
      button("Reject", () => act({ action: "approval.reject", id: a.id }, "Rejected"))))));
}

function renderRuns(runs) {
  $("runs-body").replaceChildren(...(runs.length ? runs.map((r) => el("div", { class: "card" },
    el("div", { class: "line" }, el("span", { class: "grow" }, r.agent), pill(r.status), el("span", { class: "muted" }, ago(r.startedAt))),
    r.error ? el("div", { class: "muted" }, r.error) : null))
    : [el("p", { class: "muted" }, "No runs yet.")]));
}

function setLive(text, cls) {
  $("live").className = `pill ${cls}`;
  $("live-text").textContent = text;
}

async function refresh() {
  try {
    const res = await fetch(`${BRIDGE}/state`);
    const d = await res.json();
    if (!d.online) { setLive("Paperclip offline", "bad"); $("subtitle").textContent = d.error; return; }
    const t = d.dashboard.tasks;
    $("title").textContent = `${d.company.name} · Paperclip`;
    $("subtitle").textContent = `${t.open} open · ${t.inProgress} in progress · ${t.blocked} blocked · ${t.done} done`;
    setLive("Live", "ok");
    renderAgents(d.agents); renderTasks(d.issues); renderApprovals(d.approvals); renderRuns(d.runs);
  } catch {
    setLive("Bridge offline", "bad");
    $("subtitle").textContent = "Cannot reach the local bridge on 127.0.0.1:3199. Run: launchctl kickstart -k gui/$(id -u)/com.lovelogic.paperclip-console";
  }
}

$("new-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ok = await act({
    action: "issue.create", title: $("n-title").value, description: $("n-desc").value,
    assigneeAgentId: $("n-agent").value, priority: $("n-prio").value,
  }, "Task created");
  if (ok) { $("n-title").value = ""; $("n-desc").value = ""; }
});

refresh();
setInterval(refresh, POLL_MS);
