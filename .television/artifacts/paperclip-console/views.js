// Render functions for each console panel. Pure DOM; actions go through lib.act.
import { $, el, pill, label, ago, money, button, act } from "./lib.js";

export const STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"];
const BOARD_COLUMNS = ["backlog", "todo", "in_progress", "in_review", "blocked", "done"];
const DONE_CARDS_SHOWN = 5;

export function renderKpis(d) {
  const t = d.dashboard.tasks, a = d.dashboard.agents, c = d.dashboard.costs;
  const tile = (value, name, cls = "") => el("div", { class: `kpi ${cls}` }, el("strong", {}, value), el("span", {}, name));
  $("kpis").replaceChildren(
    tile(a.active, "agents active"),
    tile(a.error, "agents in error", a.error ? "bad" : ""),
    tile(t.open + t.inProgress, "open tasks"),
    tile(t.blocked, "blocked", t.blocked ? "warn" : ""),
    tile(d.dashboard.pendingApprovals, "approvals", d.dashboard.pendingApprovals ? "warn" : ""),
    tile(money(c.monthSpendCents), c.monthBudgetCents ? `of ${money(c.monthBudgetCents)} budget` : "spent this month"));
}

function agentCard(a, reload) {
  const trouble = a.errorReason || a.pauseReason;
  return el("div", { class: "agent" },
    el("div", { class: "line" }, el("span", { class: "grow" }, a.name), pill(a.status)),
    el("div", { class: "muted" },
      `${a.title || a.role || "agent"} · ${a.adapterType} · heartbeat ${ago(a.lastHeartbeatAt)}` +
      (a.spentMonthlyCents ? ` · ${money(a.spentMonthlyCents)} spent` : "")),
    trouble ? el("div", { class: "muted warnline" }, trouble) : null,
    el("div", { class: "line" },
      button("Wake", () => act({ action: "agent.wake", id: a.id }, `Woke ${a.name}`, reload)),
      a.status === "paused"
        ? button("Resume", () => act({ action: "agent.resume", id: a.id }, `Resumed ${a.name}`, reload))
        : button("Pause", () => act({ action: "agent.pause", id: a.id }, `Paused ${a.name}`, reload))));
}

export function renderOrg(agents, reload) {
  const ids = new Set(agents.map((a) => a.id));
  const children = new Map();
  for (const a of agents) {
    const parent = ids.has(a.reportsTo) ? a.reportsTo : null;
    children.set(parent, [...(children.get(parent) || []), a]);
  }
  const branch = (parent) => {
    const kids = children.get(parent) || [];
    if (!kids.length) return null;
    return el("ul", { class: "tree" }, ...kids.map((a) => el("li", {}, agentCard(a, reload), branch(a.id))));
  };
  $("org-body").replaceChildren(branch(null) || el("p", { class: "muted" }, "No agents."));

  const select = $("n-agent");
  const keep = select.value;
  select.replaceChildren(el("option", { value: "" }, "Unassigned"),
    ...agents.map((a) => el("option", { value: a.id }, a.name)));
  select.value = keep;
}

export function renderChart(chart) {
  const peak = Math.max(1, ...chart.map((d) => d.succeeded + d.failed + d.other));
  const seg = (n, cls) => (n ? el("div", { class: `seg ${cls}`, style: `flex-grow:${n}` }) : null);
  $("chart-body").replaceChildren(el("div", { class: "bars" }, ...chart.map((d) => {
    const total = d.succeeded + d.failed + d.other;
    return el("div", { class: "bar", title: `${d.date}: ${d.succeeded} ok, ${d.failed} failed, ${d.other} other` },
      el("div", { class: "stack", style: `height:${Math.round((total / peak) * 100)}%` },
        seg(d.failed, "f"), seg(d.other, "o"), seg(d.succeeded, "s")),
      el("span", { class: "tick" }, d.date.slice(8)));
  })));
  const sum = (k) => chart.reduce((n, d) => n + d[k], 0);
  $("chart-legend").textContent = `14 days: ${sum("succeeded")} succeeded · ${sum("failed")} failed · ${sum("other")} other`;
}

export function renderBoard(issues, openTask, reload) {
  const columns = BOARD_COLUMNS.map((status) => {
    const all = issues.filter((i) => i.status === status);
    const shown = status === "done" ? all.slice(0, DONE_CARDS_SHOWN) : all;
    const col = el("div", { class: "col", "data-status": status },
      el("h3", {}, label(status), el("span", { class: "count" }, all.length)),
      ...shown.map((i) => {
        const card = el("button", { type: "button", class: "task", draggable: "true" },
          el("span", { class: "muted" }, i.identifier), el("span", { class: "ttl" }, i.title),
          el("span", { class: "muted" }, `${i.priority || "—"} · ${i.assignee || "unassigned"}`));
        card.addEventListener("click", () => openTask(i));
        card.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", i.id));
        return card;
      }),
      all.length > shown.length ? el("p", { class: "muted" }, `+${all.length - shown.length} more done`) : null);
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault(); col.classList.remove("over");
      const id = e.dataTransfer.getData("text/plain");
      const issue = issues.find((x) => x.id === id);
      if (issue && issue.status !== status) {
        act({ action: "issue.status", id, status }, `${issue.identifier} → ${label(status)}`, reload);
      }
    });
    return col;
  });
  $("board-body").replaceChildren(...columns);
}

export function renderApprovals(list, reload) {
  $("approvals").hidden = !list.length;
  $("approvals-body").replaceChildren(...list.map((a) => el("div", { class: "card" },
    el("div", { class: "line" }, el("span", { class: "grow" }, a.type || "approval"), el("span", { class: "muted" }, ago(a.createdAt))),
    el("div", { class: "line" },
      button("Approve", () => act({ action: "approval.approve", id: a.id }, "Approved", reload)),
      button("Reject", () => act({ action: "approval.reject", id: a.id }, "Rejected", reload))))));
}

export function renderActivity(items, issues, openTask) {
  const byId = new Map(issues.map((i) => [i.id, i]));
  $("activity-body").replaceChildren(...(items.length ? items.map((e) => {
    const issue = byId.get(e.issueId);
    return el("div", { class: "line act" },
      el("span", { class: "muted when" }, ago(e.createdAt)),
      el("span", { class: "grow" }, `${e.actor}: ${label(e.action)}`),
      issue ? button(issue.identifier, () => openTask(issue), { class: "link" }) : null);
  }) : [el("p", { class: "muted" }, "No recent activity.")]));
}

export function renderRuns(runs) {
  $("runs-body").replaceChildren(...(runs.length ? runs.map((r) => el("div", { class: "card" },
    el("div", { class: "line" }, el("span", { class: "grow" }, r.agent), pill(r.status), el("span", { class: "muted" }, ago(r.startedAt))),
    r.error ? el("div", { class: "muted" }, r.error) : null))
    : [el("p", { class: "muted" }, "No runs yet.")]));
}
