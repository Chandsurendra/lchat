# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-03-02 - Accessible Emoji Pickers and Svelte Custom Input Focus State Management

**Learning:** Standard hidden-file input components (using `display: none` or Tailwind's `hidden`) are completely hidden from the tabbing and reading tree of assistive technologies, making it impossible for keyboard or screen-reader-only users to trigger files uploads. By switching to Tailwind's `sr-only` class on input fields, we can keep the input focusable under screen readers. By using Tailwind's `focus-within:ring-2` on parent containers (or labels wrapping hidden inputs), we can maintain visual feedback and focus states for keyboard users seamlessly.
**Action:** Use `sr-only` coupled with parent `focus-within:ring-2` style enhancements on custom file inputs, and ensure every emoji button inside emoji grid menus is mapped with an `aria-label` describing the icon.
