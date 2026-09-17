# quantico-ai-agency — Requirements

## R1: Fix list_files glob filtering in fallback path ✅
- **Severity:** HIGH
- **Phase:** P1
- **Acceptance criteria:**
  1. list_files(glob="*.py") returns only .py files when rg is unavailable
  2. Existing test test_list_files_with_glob passes
- **Verification:** pytest tests/test_engine_complex.py::EngineComplexTests::test_list_files_with_glob ✅

## R2: Fix search_files glob filtering in fallback path ✅
- **Severity:** HIGH
- **Phase:** P1
- **Acceptance criteria:**
  1. search_files(query, glob="*.txt") searches only .txt files when rg is unavailable
  2. Session log files (.jsonl) are excluded from search results
  3. Existing test test_search_confirms_content_removed passes
- **Verification:** pytest tests/test_user_stories.py::TestNegativeSearchVerification::test_search_confirms_content_removed ✅

## R3: Exclude .quantico session dir from walk fallbacks ✅
- **Severity:** MEDIUM
- **Phase:** P1
- **Acceptance criteria:**
  1. list_files and search_files skip .quantico/ directory in fallback path
  2. No session log content in search results
- **Verification:** test_search_confirms_content_removed ✅

## R4: Fix census ACS tests: JSONDecodeError → skip ✅
- **Severity:** MEDIUM
- **Phase:** P1
- **Acceptance criteria:**
  1. When Census API returns non-JSON, test skips instead of failing
  2. JSONDecodeError caught alongside URLError
- **Verification:** pytest tests/test_fetch_census_acs.py — 8 passed, 3 skipped ✅

## R5: Fix census HTTP error test ✅
- **Severity:** LOW
- **Phase:** P1
- **Acceptance criteria:**
  1. test_fetch_census_data_handles_http_error accepts JSONDecodeError + HTTPError
- **Verification:** pytest tests/test_fetch_census_acs.py ✅

## R6: Fix FEC tests: 429 rate limit → skip ✅
- **Severity:** MEDIUM
- **Phase:** P1
- **Acceptance criteria:**
  1. check_network() returns False on 429 rate limit
  2. Tests skip when rate-limited instead of failing
- **Verification:** pytest tests/test_fetch_fec.py — 4 passed, 6 skipped ✅

## R7: Install missing optional deps ✅
- **Severity:** HIGH
- **Phase:** P1
- **Acceptance criteria:**
  1. networkx and numpy installed
  2. All 29 wiki_graph tests pass
- **Verification:** pytest tests/test_wiki_graph.py — 29 passed ✅

## R8: Bump cargo deps (PR #4)
- **Severity:** LOW
- **Phase:** P2
- **Acceptance criteria:**
  1. Cargo.lock updated with 3 dependency bumps
  2. cargo test passes
  3. cargo tauri build succeeds
- **Status:** PR open, needs merge + verification

## R9: Bump npm_and_yarn deps (PR #1)
- **Severity:** LOW
- **Phase:** P2
- **Acceptance criteria:**
  1. package-lock.json updated with 8 dependency bumps
  2. vitest run passes (15 test files)
  3. Frontend builds without errors
- **Status:** PR open, needs merge + verification

## R10: Move networkx + numpy to required deps
- **Severity:** HIGH
- **Phase:** P3
- **Acceptance criteria:**
  1. networkx and numpy in [project].dependencies (not [optional-dependencies])
  2. Fresh `pip install -e .` installs both without extras
  3. Wiki graph tests pass on fresh install
- **Status:** pending

---

# v0.3 — shipped

## R19: Recursive subtask/execute delegation in op-core ✅
- **Phase:** A1 · **Severity:** HIGH
- **Acceptance criteria:**
  1. `subtask` and `execute` spawn child loops at depth+1; several in one turn run concurrently
  2. Child results return judged against acceptance criteria
  3. Concurrent siblings cannot silently overwrite the same file
  4. Background jobs and read-before-write state survive across subtask boundaries
- **Verification:** 191 unit + 20 integration tests; runtime-checked in the app (PR #7, #8)

## R20: DuckDB evidence store with provenance ✅
- **Phase:** A2 · **Severity:** HIGH
- **Acceptance criteria:**
  1. `ingest_file` loads CSV/TSV, JSON/JSONL, Parquet and records path, source URL,
     sha256, modified time and row count in `_sources`
  2. Every ingested row carries `_source_id`; re-ingesting an identical file is skipped
  3. `sql` runs exactly one statement; file access is confined to the workspace
- **Verification:** 6 evidence tests incl. confinement and multi-statement rejection;
  runtime-checked in the app (PR #9)

---

# v0.4 — frontier capabilities

## R21: Document intelligence (PDF + scanned)
- **Phase:** F1 · **Severity:** HIGH
- **Acceptance criteria:**
  1. `ingest_file` accepts .pdf, including scanned pages
  2. `_sources` carries page number and character-span offsets per extracted unit
  3. A claim can cite a specific page of a specific document
  4. An end-to-end run ingests a real filing (e.g. a 990 or an SEC filing) and answers from it
- **Why:** most forensic source material is PDF; today's store cannot read it

## R22: Evals as a product surface
- **Phase:** F2 · **Severity:** HIGH
- **Acceptance criteria:**
  1. ≥10 gold cases with known-correct answers, committed as fixtures
  2. A scored run reports precision and recall; a seeded regression lowers the score
  3. A rubric judge replaces keyword overlap in `engine/judge.rs`
  4. Replay logs re-run as regression cases without live API calls
- **Why:** nothing currently measures whether a finding is true

## R23: Claim graph as the substrate
- **Phase:** F3 · **Severity:** HIGH · **Supersedes:** A3
- **Acceptance criteria:**
  1. Claims are produced through a structured tool schema, not markdown parsing
  2. A claims table stores subject, predicate, object, source_id, span, confidence
  3. Graph, wiki and report all render from claims; no parallel sources of truth
  4. Dated edges support a time view over the investigation

## R24: Agentic acquisition for API-less sources
- **Phase:** F4 · **Severity:** MEDIUM
- **Acceptance criteria:**
  1. At least one state registry or county portal ingests via a browser agent
  2. Provenance matches an API fetch (URL, retrieval time, content hash)
  3. A failed or rate-limited acquisition surfaces as an explicit error, not silence

## R25: Long-context mode and MCP service
- **Phase:** F5 · **Severity:** MEDIUM · **Supersedes:** A6
- **Acceptance criteria:**
  1. op-core serves MCP with evidence tools exposed
  2. An external agent completes an investigation through MCP
  3. Compaction heuristics removed; whole-corpus context path verified at 1M tokens
  4. The Bun `quantico-ai/` gateway is deleted

## R26: Release engineering (blocks distribution)
- **Severity:** HIGH
- **Acceptance criteria:**
  1. CI runs cargo test, pytest and vitest on every PR
  2. macOS builds are signed and notarized; an updater feed exists
  3. One documented runtime check against a real provider key
  4. A per-run token/cost budget bounds recursive spend
