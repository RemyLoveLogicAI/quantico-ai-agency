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
