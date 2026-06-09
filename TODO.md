# TODO

## Backend
- [x] Fix auth wiring for `POST /documents/upload` (remove optional/bypass logic; always require `get_current_user`; keep tenant derived from JWT).

- [x] Ensure `.env` is gitignored for backend and standardize `.env.example` to match `backend/app/core/config.py`.


- [ ] Extend backend tests:
  - [ ] Upload requires Authorization (401 when missing/invalid token).
  - [ ] Tenant isolation tests for upload and/or versions endpoints.
  - [ ] Versions endpoint tests for success/404 cases.

## Frontend
- [ ] Decompose `frontend/pages/dashboard.tsx` into smaller components under `frontend/components/dashboard/*`.
- [ ] Refactor dashboard page to use components without changing behavior.

## Verification
- [ ] Run backend test suite.
- [ ] Run frontend build/lint/typecheck.

