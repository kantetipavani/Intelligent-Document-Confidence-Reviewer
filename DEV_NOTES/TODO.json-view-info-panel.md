# TODO.json-view-info-panel.md

- [x] Inspect current INFO page rendering in `frontend/pages/dashboard.tsx`.
- [x] Update INFO activity payload `<pre>` to display full payload JSON (no discarding top-level keys).
- [x] Update INFO “Extracted Fields” panel to prefer `payload.extraction` (matches example payload shape).
- [ ] Verify UI manually by selecting an activity event containing `document_id/version_number/action/extraction` and confirming:
  - Full payload shows in activity payload section.
  - Extracted fields table shows invoice_no/date/amount/etc from `payload.extraction`.

