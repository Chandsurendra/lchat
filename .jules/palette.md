## 2025-05-18 - Keyboard Accessible Custom File Inputs

**Learning:** Using `class="hidden"` on file inputs removes them from the DOM accessibility tree, breaking tab focus and screen reader usability. Replacing `hidden` with `sr-only` and placing focus indicator utilities (`focus-within:ring-2 focus-within:ring-indigo-500`) on the parent `<label>` container allows seamless keyboard focus while maintaining custom visual styling.
**Action:** Always replace `class="hidden"` with `class="sr-only"` on file inputs and style the label wrapper with `focus-within:ring-*` classes.
