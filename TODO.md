- [ ] Update backend/requirements.txt to pin bcrypt to a stable version
- [ ] Add fallback logic in backend/app/core/security.py so login/register doesn’t crash if passlib bcrypt backend can’t load
- [ ] Create/refresh backend .venv and reinstall dependencies
- [ ] Run a minimal bcrypt/passlib verification script inside backend .venv
- [ ] Run backend tests (or at least import/app startup smoke test)
- [ ] Re-test the endpoint(s) that trigger the bcrypt error

