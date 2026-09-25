# Cube MCP Workbench

Open `mcp-workbench.html` in Cube's artifact sidebar. This standalone page has:

- A searchable catalog combining configured MCP names and tools exposed in the
  captured session. These are separate evidence sources, not a health guarantee.
- Three timestamped, read-only probe summaries: LSP status, Confluence connection
  status and Gemini Notebook server/auth status.
- The local Mac heartbeat schedule and latest recorded heartbeat.
- A workflow studio for code review, knowledge briefing and creative planning.
  It builds copyable/downloadable prompts and can simulate a provider outage.
  No MCP calls, model calls, uploads or jobs execute from the page.

## Refresh

```sh
node /Users/lovelogic/cube-tools/collect-mcp.mjs --refresh
```

This reads `codex mcp list --json`, the existing mesh inspector and the allowlisted
`session-catalog.json`, then updates only the embedded snapshot in the HTML.
Without `--refresh`, it prints safe JSON. It does not modify MCP configuration,
authenticate servers or start server processes. The mesh inspector uses its
existing PyYAML dependency; this demonstration installed no packages.

Session tool exposure and direct check summaries retain their capture timestamps;
the local CLI cannot reconstruct the current conversation's tool catalog or rerun
those MCP calls. Replace those fields only with newly collected session evidence.

URLs, arguments, environment values and raw command errors are not exported.
Names, tool names and selected status information are intentionally retained.
`unsupported` is the CLI's OAuth-status report, not proof that an MCP is unusable.
Similar configuration names remain separate: the captured configuration contains
both `Jam`/`jam` and `RunPod`/`runpod`.

## Verification

```sh
node --test cube-tools/collect-mcp.test.mjs cube-tools/workbench.test.mjs
```

Thirteen tests cover secret-field exclusion, command failure redaction, embedded
JSON escaping, refresh guards, search/filter behavior, tab state, prompt creation,
outage simulation, stale-prompt invalidation and generation approval boundaries.
The interface tests run application logic against a minimal DOM stand-in; they
do not render the page. Browser visual validation remains unavailable because
the prior local-file browser navigation was blocked by URL security policy.

There is no npm manifest or lockfile for this built-in-only Node utility, so npm
dependency auditing cannot run. Python's existing `pip_audit` module is absent.

## Restart evidence

The scoped heartbeat job was restarted with `launchctl kickstart -k` in the user
GUI domain. It recorded event `db7a131a1407` at `2026-09-25T02:08:12+00:00`.
That demonstrates local execution, not remote delivery to WALDO. No MCP server,
Cube application or other service was restarted.
