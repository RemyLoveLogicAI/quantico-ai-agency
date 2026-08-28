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
