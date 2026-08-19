## 2025-05-18 - File Input Keyboard & Screen Reader Accessibility

**Learning:** Using `display: none` or `class="hidden"` on file `<input type="file">` elements in custom button trigger labels makes them completely unreachable by screen readers and keyboard tabbing.
**Action:** Replace `hidden` with `sr-only` on file input elements and apply `focus-within:ring-2` (and appropriate color focus utilities) to the wrapping `<label>` container so keyboard focus is visibly indicated.
