# Bolt's Journal - Critical Learnings Only

## 2026-08-07 - [Optimizing getConversations nested searches & timestamp conversions]

**Learning:** Nested array scans inside `.map` blocks (like `allMembers.filter(...)` and `lastMessages.find(...)`) scale quadratically O(N * M) as conversation count and membership lists grow. Converting arrays to key-based `Map` structures beforehand reduces lookup overhead to O(1). Additionally, sorting ISO 8601 strings directly via lexicographical comparison (`localeCompare` or standard string comparison) avoids expensive `new Date()` object instantiation on every sort comparison.
**Action:** Always group list responses into Map lookups when nesting references in mapping loops, and leverage direct string sorting for chronological ISO string formats.
