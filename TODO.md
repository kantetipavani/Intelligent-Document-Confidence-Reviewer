# TODO - Security + Tenant Isolation (Sprint 2)

## Planned steps
- [ ] Harden tenant isolation for all document operations.
- [ ] Fix `backend/app/api/documents.py` upload route to require JWT and derive tenant_id from token.
- [ ] Ensure RBAC is enforced where appropriate.
- [ ] Regression test by running backend server/tests.

