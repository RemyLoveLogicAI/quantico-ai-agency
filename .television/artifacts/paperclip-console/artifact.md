# Paperclip Console (Television)

Purpose: interactive operator GUI for the local Paperclip server (company LoveLogic AI): org tree with wake/pause/resume, KPI tiles, 14-day run chart, drag-and-drop kanban board, task dialog (description, assignee, status, comment thread), activity feed, approvals, recent runs. Complements the read-only `paperclip-harness` artifact.

Parts:
- bridge.py: stdlib server on 127.0.0.1:3199. Paperclip's API sends no CORS headers, so the page cannot call it directly. The bridge accepts only Television's origin (127.0.0.1/localhost:32848), checks Host (anti DNS-rebinding), requires the X-TV-Console header on POST, and forwards a fixed allowlist of actions. No secrets leave it. Runs as launchd agent `com.lovelogic.paperclip-console` (KeepAlive; log /tmp/paperclip-console.log).
- index.html + console.css + lib.js (DOM/bridge helpers) + views.js (panel renderers) + console.js (state, dialogs, polling): page; polls the bridge /state every 10s, skips re-render when state is unchanged, the task dialog is open, or you are typing. Text nodes only.
- Bridge routes: GET /state, GET /comments?id=<uuid>, POST /act (issue.create/status/assign/comment, agent.wake/pause/resume, approval.approve/reject).

If Television's port changes, set TELEVISION_PORT in the plist and restart the agent. Company id is hard-coded in bridge.py (COMPANY_ID).
Undo: `launchctl bootout gui/$(id -u)/com.lovelogic.paperclip-console`, delete the plist, `tv delete-artifact` for this artifact.

## Log
- 2026-10-06 built; create/status/comment/pause/resume verified against live Paperclip with a throwaway issue (deleted). Wake, approve and reject routes not exercised (no safe target).
- 2026-10-07 enhanced: org tree, board with drag-drop, task dialog, activity, run chart, KPIs; bridge gained /comments and issue.assign and resolves terminated agents as "(former)". Verified in browser with a throwaway issue (deleted): drag, dialog, comment, status. issue.assign to a real agent not exercised (assigning wakes that agent); wake/approve/reject still untested.
