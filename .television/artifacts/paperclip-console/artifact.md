# Paperclip Console (Television)

Purpose: interactive operator GUI for the local Paperclip server (company LoveLogic AI). Wake/pause/resume agents, create and triage tasks, comment, approve/reject approvals. Complements the read-only `paperclip-harness` artifact.

Parts:
- bridge.py: stdlib server on 127.0.0.1:3199. Paperclip's API sends no CORS headers, so the page cannot call it directly. The bridge accepts only Television's origin (127.0.0.1/localhost:32848), checks Host (anti DNS-rebinding), requires the X-TV-Console header on POST, and forwards a fixed allowlist of actions. No secrets leave it. Runs as launchd agent `com.lovelogic.paperclip-console` (KeepAlive; log /tmp/paperclip-console.log).
- index.html + console.css + console.js: page; polls the bridge /state every 10s, text nodes only.

If Television's port changes, set TELEVISION_PORT in the plist and restart the agent. Company id is hard-coded in bridge.py (COMPANY_ID).
Undo: `launchctl bootout gui/$(id -u)/com.lovelogic.paperclip-console`, delete the plist, `tv delete-artifact` for this artifact.

## Log
- 2026-10-06 built; create/status/comment/pause/resume verified against live Paperclip with a throwaway issue (deleted). Wake, approve and reject routes not exercised (no safe target).
