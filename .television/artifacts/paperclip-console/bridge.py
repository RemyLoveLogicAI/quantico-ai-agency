#!/usr/bin/env python3
"""Local bridge between the Television "Paperclip Console" page and Paperclip.

Paperclip's API sends no CORS headers, so a Television page cannot call it
directly. This stdlib server listens on 127.0.0.1 only, accepts requests only
from Television's own origin, and forwards a fixed allowlist of actions.
It never returns secrets: only the fields named in collect() leave this process.
"""
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PAPERCLIP = "http://127.0.0.1:3100/api"
COMPANY_ID = "3d86c4b4-3234-4598-8124-1dfe2832caad"
PORT = int(os.environ.get("PAPERCLIP_CONSOLE_PORT", "3199"))
TV_PORT = int(os.environ.get("TELEVISION_PORT", "32848"))
ALLOWED_ORIGINS = {f"http://127.0.0.1:{TV_PORT}", f"http://localhost:{TV_PORT}"}
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
GUARD_HEADER = "X-TV-Console"  # custom header forces a CORS preflight
TIMEOUT_SEC = 10
MAX_BODY = 32 * 1024
STATUSES = {"backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"}
PRIORITIES = {"low", "medium", "high", "critical"}


def call(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(f"{PAPERCLIP}/{path}", data=data, method=method,
                                 headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:400]
        raise BridgeError(f"Paperclip {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise BridgeError(f"Paperclip unreachable: {exc}") from exc


class BridgeError(Exception):
    pass


def pick(obj, keys):
    return {k: obj.get(k) for k in keys}


def collect():
    c = f"companies/{COMPANY_ID}"
    agents = call("GET", f"{c}/agents")
    names = {a["id"]: a.get("name") for a in agents}
    runs = call("GET", f"{c}/heartbeat-runs?limit=15")
    try:
        approvals = call("GET", f"{c}/approvals?status=pending")
    except BridgeError:
        approvals = []
    return {
        "online": True,
        "company": pick(call("GET", c), ["name", "issuePrefix", "status"]),
        "dashboard": call("GET", f"{c}/dashboard"),
        "agents": [pick(a, ["id", "name", "role", "adapterType", "status", "lastHeartbeatAt"])
                   for a in agents],
        "issues": [{**pick(i, ["id", "identifier", "title", "status", "priority", "updatedAt"]),
                    "assignee": names.get(i.get("assigneeAgentId"))}
                   for i in call("GET", f"{c}/issues?limit=50")],
        "approvals": [pick(a, ["id", "type", "status", "createdAt"]) for a in approvals],
        "runs": [{**pick(r, ["status", "startedAt", "finishedAt", "error"]),
                  "agent": names.get(r.get("agentId"), "unknown")} for r in runs],
    }


def need(args, key, kind=str, limit=4000):
    value = args.get(key)
    if not isinstance(value, kind) or (kind is str and not value.strip()):
        raise BridgeError(f"'{key}' is required")
    if kind is str and len(value) > limit:
        raise BridgeError(f"'{key}' is too long")
    return value


def act(args):
    action = args.get("action")
    if action == "issue.create":
        body = {"title": need(args, "title", limit=300)}
        if args.get("description"):
            body["description"] = need(args, "description", limit=8000)
        if args.get("assigneeAgentId"):
            body["assigneeAgentId"] = need(args, "assigneeAgentId", limit=64)
        if args.get("priority") in PRIORITIES:
            body["priority"] = args["priority"]
        return call("POST", f"companies/{COMPANY_ID}/issues", body)
    if action == "issue.status":
        if args.get("status") not in STATUSES:
            raise BridgeError("unknown status")
        return call("PATCH", f"issues/{need(args, 'id', limit=64)}", {"status": args["status"]})
    if action == "issue.comment":
        return call("POST", f"issues/{need(args, 'id', limit=64)}/comments",
                    {"body": need(args, "body", limit=8000)})
    if action in {"agent.wake", "agent.pause", "agent.resume"}:
        verb = {"agent.wake": "wakeup", "agent.pause": "pause", "agent.resume": "resume"}[action]
        body = {"source": "on_demand", "reason": "Television console"} if verb == "wakeup" else {}
        return call("POST", f"agents/{need(args, 'id', limit=64)}/{verb}", body)
    if action in {"approval.approve", "approval.reject"}:
        verb = action.split(".")[1]
        return call("POST", f"approvals/{need(args, 'id', limit=64)}/{verb}", {})
    raise BridgeError("unknown action")


class Handler(BaseHTTPRequestHandler):
    server_version = "PaperclipConsoleBridge/1"

    def log_message(self, fmt, *a):
        pass

    def _origin_ok(self):
        return self.headers.get("Host") in ALLOWED_HOSTS and self.headers.get("Origin") in ALLOWED_ORIGINS

    def _send(self, status, payload):
        raw = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.send_header("cache-control", "no-store")
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("access-control-allow-origin", origin)
            self.send_header("vary", "Origin")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if not self._origin_ok():
            return self._send(403, {"error": "forbidden origin"})
        self.send_response(204)
        self.send_header("access-control-allow-origin", self.headers["Origin"])
        self.send_header("access-control-allow-methods", "GET, POST")
        self.send_header("access-control-allow-headers", f"content-type, {GUARD_HEADER}")
        self.send_header("access-control-max-age", "600")
        self.end_headers()

    def do_GET(self):
        if not self._origin_ok() or self.path != "/state":
            return self._send(403 if not self._origin_ok() else 404, {"error": "not allowed"})
        try:
            self._send(200, collect())
        except BridgeError as exc:
            self._send(200, {"online": False, "error": str(exc)})

    def do_POST(self):
        if not self._origin_ok() or self.path != "/act" or not self.headers.get(GUARD_HEADER):
            return self._send(403, {"error": "not allowed"})
        try:
            length = int(self.headers.get("content-length", "0"))
            if not 0 < length <= MAX_BODY:
                raise BridgeError("bad body size")
            args = json.loads(self.rfile.read(length))
            if not isinstance(args, dict):
                raise BridgeError("body must be an object")
            self._send(200, {"ok": True, "result": act(args)})
        except (BridgeError, ValueError) as exc:
            self._send(400, {"ok": False, "error": str(exc)})


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
