## 2025-02-18 - [Fixing Event-Type Conflict in Click-Outside Interactions]
**Learning:** When combining event-bubbling click-outside behavior with interactive UI toggles, event type synchronization is vital. Using `'pointerdown'` for outside detection alongside a toggle button's `'click'` event causes a race condition (pointerdown unmounts the picker, then click toggles it back open).
**Action:** Use `'click'` on document for click-outside handlers, or ensure all events use a matching event phase/type (e.g. `pointerdown` for both) and call `stopPropagation()`.
