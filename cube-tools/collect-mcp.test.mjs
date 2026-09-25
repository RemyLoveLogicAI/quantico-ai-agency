import assert from "node:assert/strict";
import test from "node:test";
import {
  collect,
  escapeJsonForScript,
  refresh,
  replaceWorkbenchData,
  sanitizeHeartbeat,
  sanitizeMcpServers,
  sanitizeSessionCatalog,
} from "./collect-mcp.mjs";

test("MCP projection exposes only the allowlisted fields", () => {
  const servers = sanitizeMcpServers([{
    name: "example",
    enabled: true,
    auth_status: "logged_in",
    transport: { type: "stdio", url: "https://token.example", args: ["--secret=abc"], env: { API_KEY: "abc" } },
    command: "dangerous --token abc",
  }]);
  assert.deepEqual(servers, [{ name: "example", enabled: true, transport: "stdio", auth: "logged_in" }]);
  assert.doesNotMatch(JSON.stringify(servers), /token|secret|API_KEY|https/i);
});

test("catalog and heartbeat are narrowed to their documented fields", () => {
  assert.deepEqual(sanitizeSessionCatalog({ captured_at: "now", providers: [{ name: "docs", tools: ["search", 5], secret: "no" }], checks: [{ name: "auth", state: "ok", summary: "ready", checked_at: "now", raw: "no" }], env: "no" }), {
    captured_at: "now", providers: [{ name: "docs", tools: ["search"] }], checks: [{ name: "auth", state: "ok", summary: "ready", checked_at: "now" }],
  });
  assert.deepEqual(sanitizeHeartbeat({ launchd: { loaded: true, interval_seconds: 3600, env: "no" }, heartbeat: { latest: { ts: "2026-01-01T00:00:00Z", payload: "no" } } }), {
    loaded: true, interval_seconds: 3600, latest_ts: "2026-01-01T00:00:00Z", last_exit_status: null,
  });
});

test("collector reports failures without exposing command stderr", async () => {
  const data = await collect({
    runner: async () => { throw new Error("API_KEY=top-secret https://private.example"); },
    reader: async () => { throw new Error("SESSION_TOKEN=top-secret"); },
    now: () => "2026-01-01T00:00:00.000Z",
  });
  assert.deepEqual(data.servers, []);
  assert.deepEqual(data.session, { captured_at: null, providers: [], checks: [] });
  assert.deepEqual(data.heartbeat, { loaded: null, interval_seconds: null, latest_ts: null, last_exit_status: null });
  assert.equal(data.warnings.length, 3);
  assert.doesNotMatch(JSON.stringify(data), /top-secret|private\.example|SESSION_TOKEN/);
});

test("embedded JSON escapes a script-closing angle bracket", () => {
  assert.match(escapeJsonForScript({ value: "</script><img>" }), /\\u003c\/script>\\u003cimg>/);
});

test("refresh replaces exactly one workbench-data element", async () => {
  let written;
  const runner = async (command) => ({ stdout: command === "codex" ? "[]" : "{}" });
  await refresh({
    pagePath: "/test/page.html",
    runner,
    reader: async (file) => file === "/test/page.html"
      ? '<script id="workbench-data" type="application/json">old</script>'
      : JSON.stringify({ captured_at: "now", providers: [], checks: [] }),
    writer: async (file, content) => { written = { file, content }; },
    now: () => "now",
  });
  assert.equal(written.file, "/test/page.html");
  assert.match(written.content, /"generated_at":"now"/);
});

test("replacement guard leaves invalid documents to the caller", () => {
  assert.throws(() => replaceWorkbenchData("<main></main>", "{}"), /found 0/);
  assert.throws(() => replaceWorkbenchData('<script id="workbench-data" type="application/json"></script><script id="workbench-data" type="application/json"></script>', "{}"), /found 2/);
});
