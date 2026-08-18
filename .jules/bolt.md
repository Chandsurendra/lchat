## 2025-01-01 - O(1) Indexing and Allocation-Free Sorting in Conversation Processing

**Learning:** Performing array `.filter()` or `.find()` calls inside `.map()` loops over database response arrays leads to $O(N \cdot M)$ computational overhead. Indexing secondary relation arrays into Map data structures before iterating reduces mapping complexity to $O(N)$. Additionally, replacing `new Date(ts).getTime()` with `Date.parse(ts)` in sort comparators avoids creating intermediate Date object instances on every comparison step in array sorts.
**Action:** Always pre-index relational response arrays into `Map` lookups before mapping parent models, and use `Date.parse()` for ISO string comparison sorting.
