# Filed decisions

## D1: Fix fallback paths instead of requiring ripgrep
- **Date:** 2026-08-28
- **Decision:** Fix the os.walk fallback in list_files and search_files to filter by glob, rather than making ripgrep a hard requirement. Ripgrep is in the Dockerfile but not always available in dev/test environments.
- **Rationale:** The fallback path was missing glob filtering entirely — a real bug regardless of ripgrep availability. Fixing the fallback makes the code correct in all environments.

## D2: Skip on JSONDecodeError for live API tests
- **Date:** 2026-08-28
- **Decision:** Treat JSONDecodeError from external APIs as a skip condition, not a failure. Census API returns HTML error pages when rate-limited or unavailable.
- **Rationale:** Live API tests should be resilient to transient API issues. A non-JSON response is equivalent to "API unavailable" for testing purposes.
