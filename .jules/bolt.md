## 2025-05-18 - Avoid Date Object Allocations in Array Sorting & Index Service Relations

**Learning:**

- In array comparators sorting ISO timestamp strings, using `Date.parse(a)` instead of `new Date(a).getTime()` avoids creating temporary `Date` instances on every comparison (`O(N log N)` allocations), reducing garbage collection pressure during reactive store updates.
- Batch fetching relations (like conversation members and last messages) and mapping them inside `Array.map()` with `.filter()` or `.find()` produces O(N * M) linear searches. Pre-indexing into `Map<string, T[]>` converts lookup time complexity to O(1).

**Action:**

- Use `Date.parse()` for sorting timestamp strings.
- Map batch database results into `Map` lookups before building nested object structures.
