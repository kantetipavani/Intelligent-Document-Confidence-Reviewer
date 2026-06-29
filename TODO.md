# TODO - Stack format in Account & Activity

- [ ] Inspect existing Account & Activity rendering logic (dashboard.tsx) to see how payload is normalized.
- [ ] Implement "stack" formatted storage so that when data is retrieved in "invoice reviewer", the JSON data is present at the start of the top head of "Account & Activity".
- [ ] Add/adjust normalization logic to prefer stack-shaped payloads.
- [ ] Ensure no regressions: reviewer page and info page still render correctly.
- [ ] Run frontend tests/build (if available) or TypeScript check.

