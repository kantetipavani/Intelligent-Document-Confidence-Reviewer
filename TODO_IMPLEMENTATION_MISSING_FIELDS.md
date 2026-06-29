# TODO: Implement missing fields + integrity updates

## Plan (high level)
1. Inspect current tracing + integrity/missing fields usage in gRPC and extraction pipeline.
2. Fix mismatch between gRPC proto Field (value/confidence) and backend payloads.
3. Ensure ExtractionResult schema -> frontend expected `fields` map keys with `{value, confidence}`.
4. Remove/repair any broken references (e.g., tracing injection helper) so the service runs.
5. Add/validate required gRPC request/response fields mapping from Mongo ExtractionRun.
6. Run unit tests (and/or minimal import checks) to ensure integrity.

## Step tracking
- [ ] Locate missing/incorrect fields mapping in gRPC layer
- [ ] Implement correct result_fields mapping with required proto Field shape
- [ ] Update extraction pipeline to always populate generic frontend `fields`
- [ ] Fix tracing/helper imports used by REST routes
- [ ] Validate ExtractionRun.result storage shape
- [ ] Run backend tests/import checks

