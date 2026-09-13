# Filed decisions

## D1: Fix fallback paths instead of requiring ripgrep
- **Date:** 2026-08-28
- **Decision:** Fix the os.walk fallback in list_files and search_files to filter by glob, rather than making ripgrep a hard requirement. Ripgrep is in the Dockerfile but not always available in dev/test environments.
- **Rationale:** The fallback path was missing glob filtering entirely — a real bug regardless of ripgrep availability. Fixing the fallback makes the code correct in all environments.

## D2: Skip on JSONDecodeError for live API tests
- **Date:** 2026-08-28
- **Decision:** Treat JSONDecodeError from external APIs as a skip condition, not a failure. Census API returns HTML error pages when rate-limited or unavailable.
- **Rationale:** Live API tests should be resilient to transient API issues. A non-JSON response is equivalent to "API unavailable" for testing purposes.

## D3: Consolidate on the Rust op-core engine
- **Date:** 2026-09-11
- **Decision:** Rust `op-core` is the single agent engine. The Python agent's engine is reference-only; Python stays as the data-science tool layer (fetchers, entity resolution) run via the shell tool. The Bun `quantico-ai/` gateway is to be replaced by MCP served from the engine.
- **Rationale:** The desktop app is the product and `op-core` already mirrors the Python config field-for-field. Three runtimes with two duplicate engines means every feature gets built twice.

## D4: Roles are subtask presets, not a fixed hierarchy
- **Date:** 2026-09-11
- **Decision:** Keep open-ended RLM recursion (`subtask`/`execute`). Director/specialist roles become prompt+tool presets passed to `subtask`; clearance levels become tool permission sets.
- **Rationale:** Recursion is strictly more general than a fixed Director → 3 specialists tree, and it is already implemented and tested.
