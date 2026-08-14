# Palette's Journal — Critical Learnings

## 2025-02-24 - [Keyboard and Screen Reader Friendly File Input Controls]

**Learning:** Hiding file inputs using `display: none` or the `hidden` class in Tailwind removes them from the tab order and makes them completely inaccessible to keyboard navigation and screen readers. Instead, styling them with `sr-only` keeps the input keyboard-focusable. By adding `focus-within:ring-2 focus-within:ring-indigo-500` to the parent container or `<label>`, keyboard users get a clear focus ring indicator when they tab to the control.
**Action:** When creating custom file triggers/labels, always style the `<input type="file">` with `sr-only` instead of `hidden`, and ensure its parent element has focus-within rings to visually highlight focus.
