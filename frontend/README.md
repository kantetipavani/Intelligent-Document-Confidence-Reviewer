# INDCR Frontend

Next.js frontend for the Intelligent Document Confidence Reviewer.

---

## Run In Under Minutes

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure environment:

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=INDCR
NEXT_PUBLIC_LOG_LEVEL=info
```

3. Start the dev server:

```bash
npm run dev
```

4. Open in browser:

- http://localhost:3000

---

## Frontend Features (What’s included)

### Authentication Pages

- `/login` (`pages/login.tsx`)
- `/register` (if present in your branch; referenced by docs)
- `/profile` (`pages/profile.tsx`)
- `/change-password` (`pages/change-password.tsx`)
- `/forgot-password` (`pages/forgot-password.tsx`)
- `/reset-password` (`pages/reset-password.tsx`)

These pages integrate with backend endpoints:

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me` (if used by your profile implementation)

### Document Upload + OCR Extraction

- Dashboard upload flow uses:
  - `POST /documents/upload`

Extraction completion is driven by WebSocket:

- WebSocket endpoints are mounted from backend `app.api.ws`
- Client hook used: `hooks/useExtractionFieldsFromWebSocket.ts`

### Dashboards & Review Workflows

- `/dashboard` (`pages/dashboard.tsx`)
  - Confidence dashboard (`components/ConfidenceDashboard.tsx`)
  - Anomaly/alerts cards are mounted by the dashboard components
  - Activity feed uses `GET /activity/by-email/{user_email}`

- `/[id]` document review page (`pages/[id].tsx`)
  - Shows extracted fields (`components/ExtractedFields.tsx`)
  - Shows version history (`components/VersionHistory.tsx`)
  - Shows field diffs (`components/DiffViewer.tsx`)

### Version History & Diffs

- Version history UI pulls via version endpoints (scaffolded in code; verify base paths):
  - `GET /versions/...`
  - `POST /versions/compare`

### Realtime UI Updates

- WebSocket-first extraction flow:
  - Upload triggers a `document_id`
  - Client subscribes to extraction fields for that document

---

## Project Structure

```
frontend/
├── pages/              # Next.js routes
│   ├── _app.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── profile.tsx
│   ├── change-password.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   ├── dashboard.tsx
│   └── [id].tsx        # Document review page
│
├── components/         # UI building blocks
│   ├── layout.tsx
│   ├── topbar.tsx
│   ├── PDFViewer.tsx
│   ├── ExtractedFields.tsx
│   ├── DiffViewer.tsx
│   ├── VersionHistory.tsx
│   ├── ConfidenceDashboard.tsx
│   ├── ConfidenceBadge.tsx
│   └── ...
│
├── services/          # API client wrappers
│   ├── api.ts
│   └── auth.ts
│
├── hooks/             # Custom hooks (notably WS extraction)
│   ├── useExtractionWebSocket.ts
│   ├── useExtractionFieldsFromWebSocket.ts
│   └── ...
│
├── store/             # State (auth)
│   └── authStore.ts
│
└── styles/            # CSS
```

---

## Testing

Run unit tests:

```bash
cd frontend
npm test
```

---

## API Reference (Frontend ↔ Backend)

Core backend endpoints used by the UI:

- Auth:
  - `POST /auth/login`
  - `POST /auth/logout`
  - `POST /auth/change-password`
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`

- Documents / extraction:
  - `POST /documents/upload`
  - WebSocket extraction feed (backend `app.api.ws`)

- Activity:
  - `GET /activity/by-email/{user_email}`

- Versions / review:
  - `GET /versions/...`
  - `POST /versions/compare`
  - `POST /reviews/approve`

---

## Notes

- Multi-tenant routing: the current UI hardcodes `tenant_id` as `default` in the upload/retrieval scaffolding.
- WebSocket extraction is the source of truth for when extraction is complete.

