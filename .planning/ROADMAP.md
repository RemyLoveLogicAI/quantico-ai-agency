# quantico-ai-agency — Roadmap

## Milestone: v0.2 — Test Stabilization + Dep Bumps

---

### P1 — Failing Test Fixes ✅ COMPLETE

| Req | Title | Severity | Status |
|-----|-------|----------|--------|
| R1  | Fix list_files glob filtering in fallback path | HIGH | ✅ done |
| R2  | Fix search_files glob filtering in fallback path | HIGH | ✅ done |
| R3  | Exclude .quantico session dir from walk fallbacks | MEDIUM | ✅ done |
| R4  | Fix census ACS tests: JSONDecodeError → skip | MEDIUM | ✅ done |
| R5  | Fix census HTTP error test: accept JSONDecodeError | LOW | ✅ done |
| R6  | Fix FEC tests: 429 rate limit → skip | MEDIUM | ✅ done |
| R7  | Install missing optional deps (networkx, numpy) | HIGH | ✅ done |

**Verification:** 649 passed, 46 skipped, 0 failed (was: 10 failed)

---

### P2 — Dependency Bumps ✅ COMPLETE

| Req | Issue/PR | Title | Severity | Status |
|-----|----------|-------|----------|--------|
| R8  | PR #4   | Bump cargo deps (3 updates) | LOW | ✅ merged |
| R9  | PR #1   | Bump npm_and_yarn deps (8 updates) | LOW | ✅ merged |

**Acceptance:**
- R8: cargo deps bumped, `cargo test` passes, desktop builds
- R9: npm deps bumped, `vitest run` passes, frontend builds

---

### P3 — Missing Dependencies in pyproject.toml ✅ COMPLETE

| Req | Title | Severity |
|-----|-------|----------|
| R10 | Move networkx + numpy from optional to required deps | HIGH |
| R11 | Add `ripgrep` to Dockerfile (already present) | — |

**Acceptance:**
- R10: `pip install -e .` installs networkx + numpy without `[textual]` extra
- Wiki graph tests pass on fresh install without manual pip install

---

### P4 — Desktop App Hardening

| Req | Title | Severity |
|-----|-------|----------|
| R12 | Run Rust test suite (test_model_streaming.rs) | MEDIUM |
| R13 | Run frontend vitest suite (15 test files) | MEDIUM |
| R14 | Verify Tauri build: `cargo tauri build` | HIGH |

---

### P5 — Feature: Investigation Pipeline Enhancements

| Req | Title | Severity |
|-----|-------|----------|
| R15 | Add OFAC SDN real-time sanctions check | HIGH |
| R16 | Add entity resolution across data sources | HIGH |
| R17 | Add export to PDF / CSV report generation | MEDIUM |
| R18 | Add multi-agent delegation (director → specialists) | HIGH |

---

## Milestone: v0.3 — One Engine, Evidence-First Architecture

Target: one Rust engine served over MCP; DuckDB as the evidence store; graph, wiki and reports as views of a claims table. See FILED.md D3/D4.

| Phase | Req | Title | Estimate | Status |
|-------|-----|-------|----------|--------|
| A1 | R19 | Port subtask/execute recursion into op-core (heuristic judge) | 1–2 days | ✅ done (tests green; runtime-checked vs mock) |
| A2 | R20 | DuckDB evidence store + `sql` tool; provenance (URL, modified_at, ingested_at, hash) per row | 1 day | ✅ done (ingest_file + sql, workspace-confined; runtime-checked vs mock) |
| A3 | R21 | Claims table → graph + wiki; time slider on dated edges | 2–3 days | pending |
| A4 | R16 | Entity resolution: hard IDs → Splink on DuckDB → LLM for gray zone | 2–3 days | pending |
| A5 | R17 | Steer-from-graph subtasks + evidence-locked report (Typst PDF) | 2 days | pending |
| A6 | R22 | Serve op-core over MCP; retire Bun gateway | TBD | pending |

A1 review (rust-reviewer, 2 rounds): sibling write conflicts, per-child bg-job loss and per-child read tracking fixed in 951a12a; approved.

Follow-ups for A1:
- Per-subtask model routing (`model`/`reasoning_effort` args); children reuse the parent model today.
- LLM judge instead of the keyword-overlap heuristic.
- MEDIUM: the shared `WorkspaceTools` mutex is held across `web_search`/`fetch_url` network waits, so a sibling's fast tool call waits for another sibling's HTTP round trip. Release the lock around network I/O.
- Pre-existing: `run_shell` blocks the async runtime (sync spawn + `thread::sleep`); move it to `spawn_blocking`.
- `run_shell`/`run_shell_bg` writes aren't covered by write claims (same gap in Python). Needs declared output paths or a sandbox per child. (PR #7: Copilot, Codex)
- The wiki curator writes through its own `WorkspaceTools`, outside write claims. This predates A1. (PR #7: Sourcery, CodeAnt)
- `COPY ... TO` inside the `sql` tool writes files without registering a write claim, like shell writes. (PR #9: CodeAnt)

---

## Milestone: v0.4 — Frontier Capabilities

Premise: the engine now assumes frontier models — native document reading, 1M-token
context, structured tool output, agentic browsing. Several v0.3 items were designed
around limits that no longer bind. A3–A6 are superseded as noted.

| Phase | Req | Title | Estimate | Status |
|-------|-----|-------|----------|--------|
| F1 | R21 | Document intelligence: PDF + scanned ingestion with page/span provenance | 3–4 days | pending |
| F2 | R22 | Evals as a product surface: gold cases, replay regression, rubric judge | 2–3 days | pending |
| F3 | R23 | Claim graph as the substrate (supersedes A3) | 3 days | pending |
| F4 | R24 | Agentic acquisition: browser-driven sources without APIs | 3–5 days | pending |
| F5 | R25 | Long-context mode + serve op-core over MCP (supersedes A6) | 2–3 days | pending |

**Ordering rationale:** F2 first if trust matters most — nothing else is verifiable
without a scoreboard. F1 first if coverage matters most — the evidence store currently
cannot read the formats most evidence arrives in. F3 depends on neither but improves
both. A4 (entity resolution) remains valid and slots after F3, since resolution
decisions become claims.

### Acceptance criteria

- **F1:** `ingest_file` accepts .pdf (text and scanned); `_sources` carries page and
  character-span offsets; a claim cites a page; a scanned filing ingests end to end.
- **F2:** ≥10 gold cases with known answers; `cargo test --test evals` scores precision
  and recall; the rubric judge replaces keyword overlap; a regression drops the score.
- **F3:** claims are extracted through a structured tool schema, not markdown parsing;
  graph, wiki and report all render from the claims table; every claim joins to a source.
- **F4:** at least one API-less source (a state registry or county portal) ingests
  through a browser agent, with provenance equal to an API fetch.
- **F5:** op-core serves MCP with the evidence tools exposed; an external agent runs an
  investigation end to end; compaction heuristics removed in favour of long context.

### Kill list

1. The keyword-overlap judge — replaced by F2's rubric judge.
2. The Bun `quantico-ai/` gateway — dead placeholder, superseded by F5.
3. Wiki markdown as the source of truth — becomes a view over claims (F3).
4. Context compaction tuning in `engine/mod.rs` — mostly moot under F5.

### Engineering debt blocking release (not feature work)

| Item | Why it blocks | Estimate |
|------|---------------|----------|
| Test CI on PRs (cargo, pytest, vitest) | PR bots are the only gate today | 2 hours |
| macOS signing, notarization, updater | users get "damaged app", no update path | 1 day |
| One real-provider runtime check | every check to date used a scripted mock | 1 hour + key |
| Per-run token/cost budget | recursion with parallel children is unbounded spend | 4 hours |

