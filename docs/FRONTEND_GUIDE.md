# Frontend Developer Guide

Complete guide for Next.js/React frontend development, setup, and maintenance.

---

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Project Structure](#project-structure)
3. [Pages & Routing](#pages--routing)
4. [Components](#components)
5. [State Management](#state-management)
6. [Services & API](#services--api)
7. [Styling](#styling)
8. [Development Workflow](#development-workflow)
9. [Testing](#testing)
10. [Performance](#performance)
11. [Common Tasks](#common-tasks)

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- VS Code (recommended)

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Environment

Create `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=INDCR
NEXT_PUBLIC_LOG_LEVEL=info
```

### Step 3: Start Development Server

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

### Step 4: Open in Browser

Navigate to `http://localhost:3000`

---

## Project Structure

```
frontend/
├── pages/                           # Next.js pages (routes)
│   ├── _app.tsx                    # App wrapper, providers
│   ├── _document.tsx               # HTML document template (if needed)
│   ├── index.tsx                   # Home / Landing page
│   ├── login.tsx                   # Login page
│   ├── register.tsx                # Registration page
│   ├── profile.tsx                 # User profile
│   ├── dashboard.tsx               # Main dashboard
│   ├── file.tsx                    # File detail view
│   ├── [id].tsx                    # Dynamic document view
│   └── documents/
│       └── index.tsx               # Documents listing
│
├── components/                      # Reusable React components
│   ├── layout.tsx                  # Main layout wrapper
│   ├── topbar.tsx                  # Top navigation bar
│   ├── PDFViewer.tsx               # PDF display component
│   ├── ExtractedFields.tsx         # Extracted data display
│   ├── DiffViewer.tsx              # Version comparison
│   ├── VersionHistory.tsx          # Document versions
│   └── ConfidenceBadge.tsx         # Confidence score badge
│
├── services/                        # API & helper services
│   ├── api.ts                      # Axios HTTP client
│   └── auth.ts                     # Authentication helpers
│
├── store/                           # State management
│   └── authStore.ts                # Auth state (localStorage)
│
├── hooks/                           # Custom React hooks
│   └── useDocuments.ts             # Document-related hooks
│
├── styles/                          # Global & page-specific CSS
│   ├── globals.css                 # Global styles
│   ├── dashboard.css               # Dashboard page styles
│   ├── document.css                # Document viewer styles
│   └── pdfviewer.css               # PDF viewer styles
│
├── public/                          # Static assets
│   ├── logo.png
│   └── favicon.ico
│
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── next.config.js                   # Next.js config
├── .env.local                       # Environment variables
└── next-env.d.ts                    # TypeScript declarations
```

---

## Pages & Routing

### Next.js File-Based Routing

| File | Route | Purpose |
|------|-------|---------|
| `pages/index.tsx` | `/` | Landing page |
| `pages/login.tsx` | `/login` | Login page |
| `pages/register.tsx` | `/register` | Registration page |
| `pages/dashboard.tsx` | `/dashboard` | Main dashboard |
| `pages/profile.tsx` | `/profile` | User profile |
| `pages/[id].tsx` | `/[id]` | Dynamic document page |
| `pages/documents/index.tsx` | `/documents` | Documents list |

### Creating a New Page

1. Create file in `pages/newpage.tsx`:

```typescript
import Layout from "../components/layout";

export default function NewPage() {
  return (
    <Layout>
      <div className="page-content">
        <h1>New Page</h1>
        <p>Page content here</p>
      </div>
    </Layout>
  );
}
```

2. Accessible at: `http://localhost:3000/newpage`

### Dynamic Routes

File: `pages/document/[docId].tsx`

```typescript
import { useRouter } from "next/router";

export default function DocumentPage() {
  const router = useRouter();
  const { docId } = router.query;
  
  return <div>Document: {docId}</div>;
}
```

Access at: `/document/123`, `/document/456`, etc.

### Navigation

```typescript
import Link from "next/link";
import { useRouter } from "next/router";

export default function Navigation() {
  const router = useRouter();
  
  // Navigate programmatically
  const handleClick = () => {
    router.push("/dashboard");
  };
  
  return (
    <>
      <Link href="/dashboard">Dashboard</Link>
      <button onClick={handleClick}>Go to Dashboard</button>
    </>
  );
}
```

---

## Components

### Component Structure

```typescript
import React, { useState, useEffect } from "react";
import styles from "./Component.module.css";

interface ComponentProps {
  title: string;
  onClose?: () => void;
}

export default function Component({ title, onClose }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Component initialization
  }, []);
  
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      {loading && <p>Loading...</p>}
    </div>
  );
}
```

### Built-in Components

#### 1. **Layout Component** (`components/layout.tsx`)

Wraps all pages:

```typescript
export default function Layout({ children }) {
  return (
    <>
      <Topbar />
      <main>{children}</main>
      <style jsx>{`
        main {
          padding: 20px;
        }
      `}</style>
    </>
  );
}
```

#### 2. **PDFViewer Component** (`components/PDFViewer.tsx`)

Displays PDF files:

```typescript
interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
}

export default function PDFViewer({ fileUrl, fileName }: PDFViewerProps) {
  return (
    <div className="pdf-viewer">
      <iframe 
        src={fileUrl} 
        title={fileName}
        width="100%"
        height="600px"
      />
    </div>
  );
}
```

Usage:
```typescript
<PDFViewer fileUrl="/path/to/file.pdf" fileName="invoice.pdf" />
```

#### 3. **ExtractedFields Component** (`components/ExtractedFields.tsx`)

Displays extracted data:

```typescript
interface ExtractedFieldsProps {
  fields: Record<string, any>;
}

export default function ExtractedFields({ fields }: ExtractedFieldsProps) {
  return (
    <div className="fields-grid">
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="field-card">
          <h4>{key}</h4>
          <p>{value.value || value}</p>
          {value.confidence && (
            <span className="confidence">{value.confidence}%</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 4. **VersionHistory Component** (`components/VersionHistory.tsx`)

Shows document versions:

```typescript
interface VersionHistoryProps {
  documentId: string;
}

export default function VersionHistory({ documentId }: VersionHistoryProps) {
  const [versions, setVersions] = useState([]);
  
  useEffect(() => {
    fetchVersions(documentId);
  }, [documentId]);
  
  return (
    <div className="version-list">
      {versions.map(version => (
        <div key={version.id} className="version-item">
          <span>v{version.number}</span>
          <span>{version.date}</span>
          <button>View</button>
        </div>
      ))}
    </div>
  );
}
```

---

## State Management

### Using useState Hook

```typescript
const [count, setCount] = useState(0);
const [loading, setLoading] = useState(false);
const [data, setData] = useState([]);

const increment = () => setCount(count + 1);
```

### Using useEffect Hook

```typescript
useEffect(() => {
  // Run on component mount
  fetchData();
}, []); // Empty dependency array

useEffect(() => {
  // Run when 'id' changes
  fetchDataForId(id);
}, [id]);

useEffect(() => {
  // Cleanup
  return () => {
    // Cleanup code
  };
}, []);
```

### Auth Store (`store/authStore.ts`)

```typescript
const authStore = {
  // Get token
  getToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  },
  
  // Set token
  setToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  },
  
  // Clear token
  clearToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  },
  
  // Get user email
  getUserEmail: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userEmail");
    }
    return null;
  }
};

export default authStore;
```

### Context API (Optional)

```typescript
import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// In _app.tsx
<AuthProvider>
  <Component {...pageProps} />
</AuthProvider>
```

---

## Services & API

### HTTP Client (`services/api.ts`)

```typescript
import axios, { AxiosInstance } from "axios";
import authStore from "../store/authStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      authStore.clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Calls

```typescript
import api from "../services/api";

// Upload document
export async function uploadDocument(file: File, email: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);
  formData.append("tenant_id", "default");
  formData.append("user_email", email);
  
  const response = await api.post("/documents/upload", formData);
  return response.data;
}

// Get activity
export async function getActivity(email: string) {
  const response = await api.get(`/activity/by-email/${email}`);
  return response.data;
}

// Extract fields
export async function extractDocument(docId: string) {
  const response = await api.post("/extraction/extract", {
    document_id: docId,
  });
  return response.data;
}
```

### Usage in Components

```typescript
const [fields, setFields] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  async function loadFields() {
    setLoading(true);
    try {
      const data = await getLatestExtraction(docId);
      setFields(data.extraction);
    } catch (error) {
      console.error("Failed to load fields:", error);
    } finally {
      setLoading(false);
    }
  }
  
  loadFields();
}, [docId]);
```

---

## Styling

### Styled-JSX (CSS-in-JS)

```typescript
export default function Component() {
  return (
    <>
      <div className="container">
        <h1>Hello</h1>
      </div>
      
      <style jsx>{`
        .container {
          padding: 20px;
          background: white;
          border-radius: 8px;
        }
        
        h1 {
          color: #333;
          font-size: 24px;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
        }
      `}</style>
    </>
  );
}
```

### Global Styles (`styles/globals.css`)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
  color: #333;
}

a {
  color: #0066cc;
  text-decoration: none;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}
```

### CSS Modules (Alternative)

File: `components/Button.module.css`
```css
.primary {
  background: blue;
  color: white;
  padding: 10px 20px;
}
```

File: `components/Button.tsx`
```typescript
import styles from "./Button.module.css";

export default function Button() {
  return <button className={styles.primary}>Click Me</button>;
}
```

---

## Development Workflow

### Running Dev Server

```bash
npm run dev
```

- Auto-reload on file changes
- TypeScript checking
- Fast Refresh (preserve component state)

### Building for Production

```bash
npm run build
npm start
```

### Code Formatting & Linting

```bash
npm run lint                # Run ESLint
npm run format              # Format with Prettier (if configured)
npm run type-check          # TypeScript check
```

### Debugging in VS Code

Add `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/.bin/next",
      "args": ["dev"],
      "runtimeArgs": ["--inspect"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## Testing

### Setup Jest

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest
```

### Test Example

File: `__tests__/ExtractedFields.test.tsx`
```typescript
import { render, screen } from "@testing-library/react";
import ExtractedFields from "../components/ExtractedFields";

describe("ExtractedFields", () => {
  it("displays extracted fields", () => {
    const fields = {
      invoice_number: { value: "INV-001", confidence: 0.95 },
      vendor_name: { value: "Test Corp", confidence: 0.92 },
    };
    
    render(<ExtractedFields fields={fields} />);
    
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByText("Test Corp")).toBeInTheDocument();
  });
});
```

### Run Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
```

---

## Performance

### Code Splitting

Next.js automatically splits code by page. For dynamic imports:

```typescript
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <p>Loading...</p>,
});
```

### Image Optimization

```typescript
import Image from "next/image";

<Image
  src="/invoice.png"
  alt="Invoice"
  width={400}
  height={600}
  priority  // Eager loading for above-the-fold
/>
```

### Lazy Loading

```typescript
export function useLazyLoad(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Load content
        }
      });
    });
    
    if (ref.current) observer.observe(ref.current);
  }, [ref]);
}
```

### Memoization

```typescript
import { memo } from "react";

const FieldCard = memo(({ field }) => (
  <div>{field.name}</div>
));

// Or use useMemo for expensive computations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

---

## Common Tasks

### Add Authentication Check

```typescript
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import authStore from "../store/authStore";

export function withAuth(Component) {
  return function ProtectedComponent(props) {
    const router = useRouter();
    const [isAuth, setIsAuth] = useState(false);
    
    useEffect(() => {
      const token = authStore.getToken();
      if (!token) {
        router.push("/login");
      } else {
        setIsAuth(true);
      }
    }, [router]);
    
    return isAuth ? <Component {...props} /> : null;
  };
}

// Usage
export default withAuth(DashboardPage);
```

### Handle File Upload

```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    setLoading(true);
    const response = await api.post("/documents/upload", formData);
    console.log("Upload successful:", response.data);
  } catch (error) {
    console.error("Upload failed:", error);
  } finally {
    setLoading(false);
  }
};
```

### Handle Form Submission

```typescript
const [formData, setFormData] = useState({
  email: "",
  password: "",
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value,
  });
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const response = await api.post("/auth/login", formData);
    authStore.setToken(response.data.access_token);
    router.push("/dashboard");
  } catch (error) {
    console.error("Login failed:", error);
  }
};
```

### Display Toast Notification

```typescript
const [toast, setToast] = useState("");

const showToast = (message: string, duration = 3000) => {
  setToast(message);
  setTimeout(() => setToast(""), duration);
};

return (
  <>
    <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    <style jsx>{`
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.3s;
      }
      .toast.show {
        opacity: 1;
      }
    `}</style>
  </>
);
```

### Infinite Scroll / Pagination

```typescript
const [page, setPage] = useState(1);
const [items, setItems] = useState([]);
const [hasMore, setHasMore] = useState(true);

useEffect(() => {
  const loadMore = async () => {
    const response = await api.get(`/items?page=${page}`);
    setItems([...items, ...response.data.items]);
    setHasMore(response.data.has_more);
  };
  
  loadMore();
}, [page]);

const handleLoadMore = () => {
  setPage(page + 1);
};
```

---

## Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
npm test             # Run tests

# Clean dependencies
rm -rf node_modules
npm install
```

---

## Resource Links

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Testing Library](https://testing-library.com/)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | `npm run dev -- -p 3001` |
| Module not found | `npm install` |
| TypeScript errors | Run `npm run type-check` |
| Stale cache issues | `rm -rf .next && npm run dev` |
| API connection fails | Check `NEXT_PUBLIC_API_URL` in `.env.local` |

