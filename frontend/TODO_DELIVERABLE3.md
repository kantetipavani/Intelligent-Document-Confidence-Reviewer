# TODO - Deliverable 3 (Frontend Redesign: Tailwind + shadcn/ui)

## Setup & shadcn/ui foundation
- [ ] Create/verify shadcn UI primitives under `frontend/components/ui/`: Card, Input, Progress, Table (and subcomponents), Toaster/Toast.
- [ ] Update `frontend/pages/_app.tsx` to import Tailwind CSS entry and mount React Query + Toaster.
- [ ] Clean up `frontend/styles/globals.css` by removing custom classes no longer needed (keep only required base/theme variables).

## Page migrations
- [ ] `frontend/pages/file.tsx`: replace file input with react-dropzone drag-and-drop; add upload/extraction progress UI; render extraction fields in shadcn Card with Progress confidence bar.
- [ ] `frontend/pages/[id].tsx`: replace editing UI with shadcn Input; Save button uses POST `/reviews/approve`; add shadcn Table for version history; wire DiffViewer to show field-level diffs.
- [ ] `frontend/pages/dashboard.tsx`: decompose into `frontend/components/dashboard/DocumentList.tsx`, `UploadButton.tsx`, `ExtractionSummary.tsx`, and update dashboard page to compose them.
- [ ] `frontend/pages/login.tsx` + `frontend/pages/register.tsx`: use shadcn Input/Button; add password visibility toggle; add loading spinner and Toaster-based error toasts.

## Data fetching
- [x] Introduce React Query (`@tanstack/react-query`) provider and set up `useQuery`/`useMutation` for all API calls replacing useEffect+fetch patterns.
- [x] Mount shadcn-like Toaster at app root.
- [ ] Ensure cache invalidation after approve/review/upload.
- [ ] Migrate file upload page UI to dropzone + Cards/Progress
- [ ] Migrate review page UI to editable Inputs + shadcn Table + approve POST
- [ ] Decompose dashboard into components/
- [ ] Migrate login/register to shadcn Input/Button + password toggle + spinner + Toaster
- [ ] Convert remaining fetching to react-query (useQuery/useMutation)


## Verification
- [ ] Run `npm run build` in `frontend/` and fix TS errors.
- [ ] Smoke test: /file upload+extraction, /review/:id approve flow, /login & /register.
