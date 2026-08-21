## 2025-05-19 - Map Indexing and Date Parsing in Array Comparators

**Learning:** Mapping over raw conversation query results with `Array.prototype.filter` and `Array.prototype.find` resulted in $O(N \times M)$ nested linear operations when assembling conversation data. Furthermore, instantiating `new Date()` inside sorting callbacks generated excessive heap allocation and garbage collection overhead during $O(N \log N)$ sort passes.

**Action:** Pre-group nested child arrays into `Map` lookups before mapping, and use `Date.parse()` instead of `new Date().getTime()` in array sorting comparators to preserve $O(1)$ lookups and zero allocation overhead.
