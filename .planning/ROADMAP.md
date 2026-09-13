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
| A2 | R20 | DuckDB evidence store + `sql` tool; provenance (URL, fetched_at, hash) per row | 1 day | pending |
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
