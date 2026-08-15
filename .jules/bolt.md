## 2025-05-10 - Indexing Database Join Arrays and Comparator Date Parsers

**Learning:** Correlating related arrays returned from Supabase queries (e.g., all members across conversations or last messages) using inline `.filter()` or `.find()` inside a `.map()` loop leads to $O(M \cdot N)$ complexity. Pre-grouping into `Map` lookups reduces lookup time to $O(1)$. In addition, instantiating `new Date()` inside `.sort()` comparators creates $O(N \log N)$ short-lived date objects, whereas `Date.parse()` computes numeric timestamps without object allocation.
**Action:** When mapping relational query results or sorting ISO date strings, pre-index lookups into `Map` objects and use `Date.parse()` for sorting.
