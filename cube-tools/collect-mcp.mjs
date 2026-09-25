#!/usr/bin/env node
/**
 * Read-only data collector for Cube's MCP Workbench.
 *
 * The collector deliberately projects command output onto a tiny public schema.
 * Configuration, endpoints, command lines, environment values, and stderr never
 * become part of the dashboard data.
 */
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "cube-tools", "session-catalog.json");
const PAGE_PATH = path.join(ROOT, "mcp-workbench.html");
const OBSERVATORY_PATH = path.join(ROOT, "agent-mesh", "observatory.py");

const emptySession = () => ({ captured_at: null, providers: [], checks: [] });
const emptyHeartbeat = () => ({
  loaded: null,
  interval_seconds: null,
  latest_ts: null,
  last_exit_status: null,
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Return only the MCP server fields intended for the workbench. */
export function sanitizeMcpServers(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((server) => {
    if (!isPlainObject(server) || typeof server.name !== "string") return [];
    return [{
      name: server.name,
      enabled: server.enabled === true,
      transport: typeof server.transport?.type === "string" ? server.transport.type : null,
      auth: typeof server.auth_status === "string" ? server.auth_status : null,
    }];
  });
}

/** Retain the documented session catalog fields while rejecting malformed entries. */
export function sanitizeSessionCatalog(value) {
  const session = emptySession();
  if (!isPlainObject(value)) return session;
  session.captured_at = typeof value.captured_at === "string" ? value.captured_at : null;
  if (Array.isArray(value.providers)) {
    session.providers = value.providers.flatMap((provider) => {
      if (!isPlainObject(provider) || typeof provider.name !== "string" || !Array.isArray(provider.tools)) return [];
      return [{ name: provider.name, tools: provider.tools.filter((tool) => typeof tool === "string") }];
    });
  }
  if (Array.isArray(value.checks)) {
    session.checks = value.checks.flatMap((check) => {
      if (!isPlainObject(check) || typeof check.name !== "string") return [];
      return [{
        name: check.name,
        state: typeof check.state === "string" ? check.state : null,
        summary: typeof check.summary === "string" ? check.summary : null,
        checked_at: typeof check.checked_at === "string" ? check.checked_at : null,
      }];
    });
  }
  return session;
}

/** Whitelist only the heartbeat fields exposed by agent-mesh/observatory.py. */
export function sanitizeHeartbeat(value) {
  const heartbeat = emptyHeartbeat();
  if (!isPlainObject(value)) return heartbeat;
  heartbeat.loaded = typeof value.launchd?.loaded === "boolean" ? value.launchd.loaded : null;
  heartbeat.interval_seconds = typeof value.launchd?.interval_seconds === "number"
    ? value.launchd.interval_seconds : null;
  heartbeat.latest_ts = typeof value.heartbeat?.latest?.ts === "string" ? value.heartbeat.latest.ts : null;
  // The current read-only observatory snapshot does not expose launchd's exit status.
  heartbeat.last_exit_status = typeof value.launchd?.last_exit_status === "number"
    ? value.launchd.last_exit_status : null;
  return heartbeat;
}

export function escapeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function replaceWorkbenchData(html, encoded) {
  const pattern = /(<script\s+id=["']workbench-data["']\s+type=["']application\/json["']\s*>).*?(<\/script>)/gs;
  let count = 0;
  const updated = html.replace(pattern, (match, start, end) => {
    count += 1;
    return `${start}${encoded}${end}`;
  });
  if (count !== 1) throw new Error(`Expected exactly one workbench-data element; found ${count}`);
  return updated;
}

async function readJsonFile(file, label, warnings, reader) {
  try {
    return JSON.parse(await reader(file, "utf8"));
  } catch {
    warnings.push(`${label} is unavailable or invalid; using an empty snapshot.`);
    return null;
  }
}

async function runJson(command, args, label, warnings, runner) {
  try {
    const { stdout } = await runner(command, args, { encoding: "utf8", timeout: 20_000, maxBuffer: 1_000_000 });
    return JSON.parse(stdout);
  } catch {
    warnings.push(`${label} could not be collected; using an empty snapshot.`);
    return null;
  }
}

/** Collect a secret-safe snapshot. Injection points support deterministic tests. */
export async function collect({ runner = execFileAsync, reader = readFile, now = () => new Date().toISOString() } = {}) {
  const warnings = [];
  const [mcp, catalog, observatory] = await Promise.all([
    runJson("codex", ["mcp", "list", "--json"], "MCP configuration", warnings, runner),
    readJsonFile(CATALOG_PATH, "Session catalog", warnings, reader),
    runJson("/usr/bin/python3", [OBSERVATORY_PATH], "Heartbeat status", warnings, runner),
  ]);
  return {
    generated_at: now(),
    servers: sanitizeMcpServers(mcp),
    session: sanitizeSessionCatalog(catalog),
    heartbeat: sanitizeHeartbeat(observatory),
    warnings,
  };
}

export async function refresh({ pagePath = PAGE_PATH, reader = readFile, writer = writeFile, ...options } = {}) {
  const data = await collect(options);
  const page = await reader(pagePath, "utf8");
  await writer(pagePath, replaceWorkbenchData(page, escapeJsonForScript(data)), "utf8");
  return data;
}

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== "--refresh")) {
    throw new Error("Usage: collect-mcp.mjs [--refresh]");
  }
  if (process.argv.includes("--refresh")) {
    const data = await refresh();
    process.stdout.write(`${escapeJsonForScript(data)}\n`);
    return;
  }
  process.stdout.write(`${escapeJsonForScript(await collect())}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`MCP workbench collector failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
