# quantico-ai-agency — Project

## What this is

Quantico AI Agency — a recursive LLM investigation agent for financial forensics.
Python CLI agent + Tauri 2 desktop app with live knowledge graph visualization.
Ingests heterogeneous datasets (corporate registries, campaign finance, lobbying
disclosures, government contracts) and surfaces non-obvious connections through
evidence-backed analysis.

Forked from OpenPlanter. Rebranded to Quantico.

## Architecture

```
openplanter-desktop/crates/op-core/   — THE engine (FILED.md D3)
  engine/mod.rs      — recursive solve loop; subtask/execute delegation, curator
  engine/claims.rs   — write claims guarding concurrent children
  engine/judge.rs    — acceptance verdicts (keyword overlap; to be replaced, F2)
  tools/evidence.rs  — DuckDB evidence store: ingest_file + sql, provenance
  tools/{filesystem,shell,web,patching}.rs — workspace tools
  model/{openai,anthropic}.rs — providers (OpenAI, Anthropic, OpenRouter, Cerebras, Ollama)
  wiki/              — markdown wiki → petgraph knowledge graph
  session/replay.rs  — session persistence and replay

openplanter-desktop/crates/op-tauri/  — desktop shell: commands, IPC, state
openplanter-desktop/frontend/         — three-pane UI; Cytoscape.js graph

agent/               — Python CLI agent. Reference implementation + data tooling only;
                       not the engine (D3). Still the larger test suite.
scripts/             — 15 Python data fetchers (FEC, SEC EDGAR, USASpending, SAM.gov,
                       Senate lobbying, OFAC SDN, ICIJ, ProPublica 990, Census, FDIC,
                       OSHA, EPA ECHO) plus entity_resolution + timing_analysis
quantico-ai/         — Bun/Hono gateway. Deprecated placeholder; MCP replaces it (F5).
wiki/                — baseline data-source documentation (15 docs)
tests/               — 694 Python tests (649 pass, 46 skip, 0 fail)
```

## Current capabilities

- **Recursive delegation:** `subtask` and `execute` spawn child agent loops, run
  concurrently within a turn, and return judged results. Sibling writes to the same
  file are rejected rather than silently clobbered.
- **Evidence store:** DuckDB at `<workspace>/.quantico/evidence.duckdb`. `ingest_file`
  records path, source URL, sha256, modified time and row count in `_sources` and tags
  every row with `_source_id`; `sql` queries it. File access is confined to the
  workspace by DuckDB settings, and only one statement runs per call.
- **Knowledge graph:** wiki markdown parsed into a graph, rendered live in the app.
- **Sessions:** persisted with replay logs; a background curator keeps the wiki linked.

## Known gaps

1. **Cannot read documents.** Ingestion takes CSV/TSV, JSON/JSONL and Parquet only.
   Most forensic source material is PDF or scanned. (F1)
2. **Accuracy is unmeasured.** The acceptance judge is keyword overlap; no gold cases,
   no benchmark, nothing scores whether a finding is true. (F2)
3. **No test CI.** `release.yml` is the only workflow; no PR runs cargo/pytest/vitest.
4. **Not distributable.** No signing, notarization or updater config in tauri.conf.json.
5. **Never run against a real provider.** Every runtime check used a scripted mock.
   No token or cost budget exists for recursive runs.

## Shipped work (from git history)

### v0.1.2
- Rebrand from OpenPlanter to Quantico across Python agent + Rust desktop
- Desktop bundle bumped to 0.1.2
- CHANGELOG.md added for v0.1.0

### v0.1.0
- Full Python CLI agent: recursive LLM engine, multi-provider model, workspace tools
- Tauri 2 desktop app with three-pane layout (sidebar, chat, knowledge graph)
- 15 data source fetchers: FEC, Census ACS, SEC EDGAR, USASpending, SAM.gov,
  Senate lobbying, OSHA, EPA ECHO, FDIC, OFAC SDN, ICIJ Leaks, ProPublica 990
- Session persistence + replay
- Background wiki curator
- Docker support
- 694 Python tests + 15 TypeScript tests + 1 Rust test

### P1 — Failing Test Fixes (Aug 28, 2026) ✅
- Fixed list_files glob filtering in fallback path (no ripgrep)
- Fixed search_files glob filtering in fallback path
- Excluded .quantico session dir from search/list fallbacks
- Fixed census ACS tests: catch JSONDecodeError as network issue → skip
- Fixed census HTTP error test: accept JSONDecodeError alongside HTTPError
- Fixed FEC tests: check_network catches 429 rate limit → skip
- Installed networkx + numpy (were missing optional deps)
- Result: 10 failures → 0 failures (649 passed, 46 skipped)

### v0.3 — Rust engine consolidation (Sep 2026) ✅
- op-core is the single engine (FILED.md D3); Python agent is reference-only
- Recursive `subtask`/`execute` delegation with write claims (PR #7, #8)
- DuckDB evidence store: `ingest_file` + `sql` with provenance (PR #9)
- 191 Rust unit + 20 integration tests passing

### v0.4 — Frontier capabilities (planned)
- F1: PDF + scanned document ingestion (R21)
- F2: Evals as product surface — gold cases, rubric judge (R22)
- F3: Claim graph as substrate (R23)
- F4: Agentic acquisition for API-less sources (R24)
- F5: Long-context mode + MCP service (R25)

## Test inventory

| Suite | Tests | Status |
|-------|-------|--------|
| Rust op-core (unit) | 191 | passing |
| Rust op-core (integration) | 20 | passing |
| Python (tests/) | ~694 | 649 pass, 46 skip |
| Frontend (vitest) | 15 files | passing |
| Evals / gold cases | 0 | missing (F2) |

## Tech stack

- **Python agent:** Python 3.10+, rich, prompt_toolkit, textual, networkx, numpy
- **Desktop:** Tauri 2, Rust, React, Cytoscape.js, TypeScript, Vitest
- **Testing:** pytest, vitest, cargo test
- **CI:** GitHub Actions (release.yml)
- **Docker:** python:3.12-slim + ripgrep
