# CI/CD (GitHub Actions)

This project uses GitHub Actions workflows in `.github/workflows`.

## Current setup
- `ci.yml` provides a **single, ordered pipeline** that runs: build -> lint -> tests -> dependency checks -> security checks.
- Existing individual workflows (`build-check.yml`, `lint.yml`, `tests.yml`, `dependency-check.yml`, `security.yml`) are still present; if both sets run for the same commit, you may see duplicates.

## Deploy recommendation
For production deployments, add a deploy job that runs **only after** all checks pass.
- If you want deployment to happen automatically, create a job in `ci.yml` with `needs: [...]`.
- For GitHub Pages / Vercel / Docker deployments, we can wire credentials and the deployment command.


