## 2025-05-18 - Keyboard Accessible File Upload Controls

**Learning:** Hiding file inputs using `display: none` (`hidden`) removes them from the accessibility tree and keyboard tab order, preventing screen reader and keyboard-only users from attaching files.
**Action:** Replace `hidden` on input elements with `sr-only`, add explicit `aria-label` attributes to the input, and apply `focus-within:ring-2` to the wrapping container/label to ensure keyboard focus indicators remain visible.
