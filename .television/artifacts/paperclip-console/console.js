// Interactive Paperclip console. Talks only to the local bridge (bridge.py).
import { $, el, label, ago, button, act, getJSON, toast } from "./lib.js";
import * as v from "./views.js";
import { filterIssues } from "./filters.mjs";
import {getStore,ref,onValue,push,onAccessChanged,onConnectionStatusChanged,serverTimestamp} from '/sdk/v1/resources.js';

const POLL_MS = 10000;
const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);
let lastSig = "";
let current = null;

function setLive(text, cls) {
  $("live").className = `pill ${cls}`;
  $("live-text").textContent = text;
}

async function loadComments(issue) {
  const box = $("d-comments");
  const data = await getJSON(`/comments?id=${encodeURIComponent(issue.id)}`);
  box.replaceChildren(...(data.comments?.length ? data.comments.map((c) => el("div", { class: "comment-item" },
    el("div", { class: "muted" }, `${c.author} · ${ago(c.createdAt)}`), el("div", { class: "cbody" }, c.body)))
    : [el("p", { class: "muted" }, data.error || "No comments yet.")]));
}

function openTask(issue) {
  $("d-title").textContent = `${issue.identifier} · ${issue.title}`;
  $("d-desc").textContent = issue.description || "No description.";
  const status = $("d-status");
  status.replaceChildren(...v.STATUSES.map((s) => el("option", { value: s }, label(s))));
  status.value = issue.status;
  status.onchange = () => act({ action: "issue.status", id: issue.id, status: status.value },
    `${issue.identifier} → ${label(status.value)}`, refresh);
  const who = $("d-assignee");
  who.replaceChildren(el("option", { value: "" }, "Unassigned"),
    ...(current?.agents || []).map((a) => el("option", { value: a.id }, a.name)));
  who.value = issue.assigneeAgentId || "";
  who.onchange = () => act({ action: "issue.assign", id: issue.id, assigneeAgentId: who.value },
    who.value ? "Reassigned" : "Unassigned", refresh);
  const note = $("d-note");
  note.value = "";
  $("d-send").onclick = async () => {
    if (!note.value.trim()) return;
    if (await act({ action: "issue.comment", id: issue.id, body: note.value }, "Comment posted", () => loadComments(issue))) note.value = "";
  };
  $("d-comments").replaceChildren(el("p", { class: "muted" }, "Loading…"));
  $("detail").showModal();
  loadComments(issue).catch(() => toast("Could not load comments", true));
}

function render(d) {
  current = d;
  $("title").textContent = `${d.company.name} · Paperclip`;
  $("subtitle").textContent = `${d.agents.length} agents · ${d.issues.length} tasks`;
  v.renderKpis(d); v.renderOrg(d.agents, refresh); v.renderChart(d.runChart);
  renderFilteredBoard(); v.renderApprovals(d.approvals, refresh);
  v.renderActivity(d.activity, d.issues, openTask); v.renderRuns(d.runs);
  const selected = $("board-assignee").value;
  $("board-assignee").replaceChildren(el("option", {value:""}, "All assignees"), el("option", {value:"unassigned"}, "Unassigned"), ...d.agents.map(a=>el("option",{value:a.id},a.name)));
  $("board-assignee").value = selected;
  $("n-agent").replaceChildren(el("option",{value:""},"Unassigned"), ...d.agents.map(a=>el("option",{value:a.id},a.name)));
}

export async function refresh() {
  try {
    const d = await getJSON("/state");
    if (!d.online) { setLive("Paperclip offline", "bad"); $("subtitle").textContent = d.error; return; }
    setLive("Live", "ok");
    const sig = JSON.stringify(d);
    const busy = TYPING.has(document.activeElement?.tagName) && document.activeElement.closest("main");
    if (sig === lastSig || busy || $("detail").open) return;
    lastSig = sig;
    render(d);
  } catch {
    setLive("Bridge offline", "bad");
    $("subtitle").textContent = "Cannot reach the local bridge on 127.0.0.1:3199. Run: launchctl kickstart -k gui/$(id -u)/com.lovelogic.paperclip-console";
  }
}

$("new-open").addEventListener("click", () => $("new-dialog").showModal());
$("console-refresh").addEventListener("click", () => { lastSig = ""; refresh(); });
$("new-cancel").addEventListener("click", () => $("new-dialog").close());
$("d-close").addEventListener("click", () => { $("detail").close(); refresh(); });
$("new-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ok = await act({
    action: "issue.create", title: $("n-title").value, description: $("n-desc").value,
    assigneeAgentId: $("n-agent").value, priority: $("n-prio").value,
  }, "Task created", async () => { lastSig = ""; await refresh(); });
  if (ok) { $("n-title").value = ""; $("n-desc").value = ""; $("new-dialog").close(); }
});

const filterFields = {query:"board-search", status:"board-status", priority:"board-priority", assignee:"board-assignee"};
const readFilters = () => Object.fromEntries(Object.entries(filterFields).map(([key,id])=>[key,$(id).value]));
function renderFilteredBoard() {
  if (!current) return;
  const filters=readFilters(), issues=filterIssues(current.issues,filters);
  const totals=new Map(v.STATUSES.map(status=>[status,current.issues.filter(i=>i.status===status).length]));
  const filtered=Object.values(filters).some(Boolean);
  v.renderBoard(issues,openTask,refresh,{totals,filtered,columns:filters.status === "cancelled" ? ["cancelled"] : v.BOARD_COLUMNS});
  $("board-result-count").textContent=`${issues.length} of ${current.issues.length} tasks`;
}
$("board-status").append(...v.STATUSES.map(status=>el("option",{value:status},label(status))));
for (const id of Object.values(filterFields)) $(id).addEventListener("input",renderFilteredBoard);
$("board-clear").addEventListener("click",()=>{for(const id of Object.values(filterFields))$(id).value="";renderFilteredBoard();});
// savedBoardViews: {<push-key>: {name:string,filters:{query,status,priority,assignee:string},createdAt:number}}.
// Viewers and agents may add views. This store does not mutate Paperclip records.
const viewStore=getStore(); let viewWritable=false,viewConnected=false,savedViews={};
const viewControls=()=>{$("board-save-view").disabled=!viewWritable||!viewConnected;};
onAccessChanged(access=>{viewWritable=access==='read-write';viewControls();});
onConnectionStatusChanged(state=>{viewConnected=state!=='disconnected';viewControls();if(!viewConnected)$("board-view-status").textContent='Saved views disconnected; filters still work.';});
onValue(ref(viewStore,'savedBoardViews'),snap=>{savedViews=snap.val()??{};const selected=$("board-load-view").value;$("board-load-view").replaceChildren(el("option",{value:""},"Choose a saved view"),...Object.entries(savedViews).filter(([,value])=>typeof value?.name==='string').map(([key,value])=>el("option",{value:key},value.name)));$("board-load-view").value=selected;$("board-view-status").textContent=snap.metadata.hasPendingWrites?'Saving view…':'Saved views synced';},error=>{$("board-view-status").textContent=error.message;});
$("board-save-view").addEventListener("click",async()=>{const name=$("board-view-name").value.trim();if(!name){$("board-view-status").textContent='Give the view a name.';return;}if(!viewWritable||!viewConnected)return;try{await push(ref(viewStore,'savedBoardViews'),{name,filters:readFilters(),createdAt:serverTimestamp()});$("board-view-name").value="";}catch(error){$("board-view-status").textContent=error.message;}});
$("board-load-view").addEventListener("change",()=>{const view=savedViews[$("board-load-view").value];if(!view?.filters)return;for(const [key,id] of Object.entries(filterFields))$(id).value=view.filters[key]??"";renderFilteredBoard();});

refresh();
setInterval(refresh, POLL_MS);
