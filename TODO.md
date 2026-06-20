# TODO - Fix login bcrypt/passlib + password length crash

## Plan
- [ ] Read & understand current auth/security code (already reviewed `app/core/security.py` and `app/api/auth.py`).
- [x] Add input validation in `/login` to block passwords > 72 bytes (mirrors `/register`).

- [x] Fix local dependency mismatch: ensure `bcrypt` + `passlib` are compatible in `backend/.venv`.
- [x] Re-run `uvicorn` and test `/auth/login` for success.




