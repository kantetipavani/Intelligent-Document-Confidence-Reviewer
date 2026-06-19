from __future__ import annotations

from prometheus_client import Counter

# Cache counters
cache_hits_total = Counter(
    "cache_hits_total",
    "Total number of cache hits",
    labelnames=["endpoint"],
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total number of cache misses",
    labelnames=["endpoint"],
)

