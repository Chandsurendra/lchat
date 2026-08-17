## 2025-08-17 - Fast ISO Date Parsing with Date.parse()

**Learning:** Using `new Date(isoString).getTime()` inside array sorting callbacks or time difference calculations allocates temporary `Date` instances on the heap for every element and comparison, causing unnecessary Garbage Collection (GC) overhead. `Date.parse(isoString)` directly parses ISO strings into numeric millisecond timestamps without heap allocations.
**Action:** When comparing ISO timestamps in sorting functions or relative time helpers, always use `Date.parse()` or primitive numeric timestamps instead of instantiating `new Date()`.
