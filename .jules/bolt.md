## 2025-05-18 - Avoid Heap Allocations in Array Sorting Comparators

**Learning:** Using `new Date(timestamp).getTime()` inside `Array.prototype.sort()` comparator functions instantiates temporary `Date` objects on every comparison ($O(N \log N)$ allocations). `Date.parse(timestamp)` parses ISO date strings directly to numeric epoch timestamps without allocating heap objects.
**Action:** Always prefer `Date.parse()` over `new Date().getTime()` in sorting comparators and tight loops.
