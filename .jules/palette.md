## 2025-05-18 - Keyboard Focus and ARIA Labels for File Inputs & Custom Buttons

**Learning:** Hidden file inputs (`class="hidden"`) bypass keyboard focus navigation and screen reader accessibility completely. Replacing `hidden` with `sr-only` on the `<input type="file">` and adding focus indicator styles (`focus-within:ring-2 focus-within:ring-indigo-500`) to the wrapper `<label>` enables complete keyboard tab accessibility.
**Action:** When working on custom file upload buttons in Svelte/Tailwind, use `sr-only` on input and `focus-within:ring-*` on the interactive `<label>` element.
