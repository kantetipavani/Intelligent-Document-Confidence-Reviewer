# Load Test Report (Locust)

This report compares baseline vs with-Redis latency for the `GET /documents` endpoint.

## How tests were run

- Users: **50 concurrent**
- Duration: **60s**
- CSV outputs:
  - `results/baseline/*`
  - `results/with_redis/*`

## Summary (fill from generated CSVs)

> Note: The following values must be populated from Locust CSV stats (typically `locust_stats.csv` or `*_stats.csv`).

| Metric | Baseline (no Redis) | With Redis |
|---|---:|---:|
| p50 (ms) - `GET /documents` | 0 (no requests captured) | 0 (no requests captured) |
| p95 (ms) - `GET /documents` | 0 (no requests captured) | 0 (no requests captured) |
| p99 (ms) - `GET /documents` | 0 (no requests captured) | 0 (no requests captured) |


## Threshold enforcement (with Redis)

Hard threshold requirement:

- **p95 latency on `GET /documents` must be under 400ms with Redis**

Result:

- **PASS/FAIL**: N/A (computed by `locustfile.py` during the `with_redis` run)

## CSV locations

- Baseline: `results/baseline/`
- With Redis: `results/with_redis/`

