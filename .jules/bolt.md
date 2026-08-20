## 2025-05-18 - Avoid Date Object Allocations in Array Sorting & Index Nested Relations

**Learning:** Calling `new Date().getTime()` inside Array.prototype.sort comparators causes $O(N \log N)$ short-lived `Date` object allocations and GC thrashing. Using `Date.parse()` evaluates directly to primitive timestamp numbers without object instantiation. Additionally, performing linear searches (`filter` or `find`) inside map iterations over DB query results creates $O(N \cdot M)$ complexity, which can be optimized to $O(N + M)$ using `Map` indexing before the mapping loop.

**Action:** Always prefer `Date.parse(isoString)` in sort comparators, and index relation arrays into Maps by foreign key before mapping over lists.
