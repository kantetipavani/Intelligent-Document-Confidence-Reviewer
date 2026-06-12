# TODO_DELIVERABLE3_WORK.md

## Step 1 — Dashboard decomposition + react-query migration
- [x] Create `frontend/components/DocumentList.tsx`
- [x] Create `frontend/components/UploadButton.tsx`
- [x] Create `frontend/components/ExtractionSummary.tsx`
- [ ] Refactor `frontend/pages/dashboard.tsx` to compose those components
- [x] Replace dashboard `useEffect + api.get` activity loader with `useQuery`
- [x] Ensure query cache keys and loading/error states render correctly

## Step 2 — Upload page redesign (react-dropzone + progress + shadcn Cards)
- [ ] Refactor `frontend/pages/file.tsx` upload input -> `react-dropzone` drag/drop zone
- [ ] Add upload/processing progress indicator using `components/ui/progress`
- [ ] Replace extracted field rendering with shadcn `Card` per field
- [ ] Add confidence tier mapping (green >= 0.85, amber 0.60-0.84, red < 0.60) using `Progress`
- [ ] Replace polling `useEffect` with react-query `useQuery({ refetchInterval })`

## Step 3 — Document review page redesign (editable Inputs + approve POST + version table + diff viewer)
- [ ] Refactor `frontend/pages/[id].tsx` to use shadcn `Input` for editable fields
- [ ] Convert save handler to `useMutation` -> POST `/reviews/approve`
- [ ] Replace `VersionHistory` with shadcn `Table`:
  - [ ] Columns: Version, Action (AI/Human), Reviewer, Timestamp
- [ ] Update `DiffViewer` to show field-level changes between versions
- [ ] Replace `useEffect` fetches with `useQuery`

## Step 4 — Login/Register UI migration (shadcn Input/Button, password toggle, spinner, toast)
- [ ] Refactor `frontend/pages/login.tsx`:
  - [ ] shadcn `Input` + `Button`
  - [ ] password visibility toggle
  - [ ] loading spinner during submit
  - [ ] toast errors/success using shadcn Toaster/toast API
- [ ] Refactor `frontend/pages/register.tsx` similarly

## Step 5 — Cleanup & remaining globals/classes
- [ ] Remove unused custom CSS blocks from migrated pages where possible
- [ ] Ensure Tailwind utilities replace prior `className`-dependent CSS-in-JS in those pages
- [ ] Verify build and run

## Step 6 — Final verification
- [ ] `frontend` build passes
- [ ] `dashboard`, `file`, `review [id]`, `login`, `register` routes render without runtime errors

