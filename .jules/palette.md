# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - File Input Focus ring and ARIA Labels in Chat Composer

**Learning:** Hidden file input elements (`class="hidden"`) prevent keyboard navigation and screen readers from focusing on or interacting with file attachments.
**Action:** Replace `hidden` on input elements with `sr-only` and add `focus-within:ring-2` to the parent container/label to ensure keyboard-accessible file uploads and visible focus indicators.
