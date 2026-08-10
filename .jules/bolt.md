## 2025-10-24 - [Avoid Redundant Helper Computations in Svelte 5 each Blocks]
**Learning:** Using helper functions that perform array lookups (like `getOtherParticipant` or `conversationTitle`) directly in component markup inside Svelte `{#each}` loops causes them to be called multiple times per element (e.g., for avatar, name, and title). This leads to O(n * m) overhead on rendering and reactivity updates.
**Action:** Always use Svelte `{@const}` to compute the result of such helpers exactly once per loop iteration, caching the value for all subsequent uses within the iteration block.
