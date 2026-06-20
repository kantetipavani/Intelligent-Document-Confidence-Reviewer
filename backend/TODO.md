# TODO

- [ ] Investigate missing import `_k_dashboard_stats` and intended dashboard stats cache key.
- [ ] Fix startup ImportError by defining `_k_dashboard_stats` in `backend/app/api/documents.py` (or updating `reviews.py` import) so app can boot.
- [x] Re-run `uvicorn app.main:app --reload --port 8000` to confirm no ImportError.

