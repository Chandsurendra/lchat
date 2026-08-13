## 2025-02-18 - Nested $derived Array Searches in Svelte 5 Components
**Learning:** Performing array searches (like `.find()`) inside a component-level `$derived` rune that references a global/parent store leads to $O(N^2)$ overall rendering complexity on store mutations across multiple active component instances.
**Action:** Move the lookup indexing logic to a store-level `$derived` getter (returning a plain JavaScript Record instead of a `Map` to avoid Svelte/ESLint reactivity issues) and perform $O(1)$ lookups inside the component instances instead.
