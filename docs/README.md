# INDCR Documentation

Complete documentation for the INDCR (Intelligent Document Confidence Reviewer) project.

---

## 📚 Documentation Index

### 🎯 Getting Started
- [Main README](../README.md) - Start here for project overview

### 🏗️ Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, data flow, component overview
  - Three-tier architecture
  - Data flow diagrams
  - Integration points
  - Technology justifications

### 🔌 API Reference
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API endpoints reference
  - Authentication
  - All endpoints with examples
  - Error responses
  - Rate limiting
  - SDK examples

### 👨‍💻 Developer Guides

#### Backend Development
- **[BACKEND_GUIDE.md](./BACKEND_GUIDE.md)** - FastAPI backend development
  - Setup & installation
  - Project structure
  - Database models
  - Services & business logic
  - Testing
  - Performance tips
  - Common tasks

#### Frontend Development
- **[FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)** - React/Next.js frontend development
  - Setup & installation
  - Pages & routing
  - Components
  - State management
  - API integration
  - Styling
  - Testing
  - Performance

### 📊 Data & Database
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - MongoDB collections & models
  - Collection schemas
  - Field descriptions
  - Indexes
  - Relationships
  - Aggregation examples
  - Backup & recovery
  - Data validation

### 🚀 Deployment & Operations
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
  - Pre-deployment checklist
  - Backend deployment options
  - Frontend deployment options
  - Database deployment
  - Docker & containerization
  - Monitoring & logging
  - Scaling strategies
  - Security
  - Troubleshooting

### 🤝 Contributing
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contributing guidelines
  - Code of conduct
  - Development workflow
  - Coding standards
  - Commit guidelines
  - Pull request process
  - Testing requirements
  - Documentation standards

---

## 🗂️ Quick Navigation

### By Role

**Frontend Developer?**
→ Start with [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) + [ARCHITECTURE.md](./ARCHITECTURE.md)

**Backend Developer?**
→ Start with [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) + [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**DevOps/Infrastructure?**
→ Start with [DEPLOYMENT.md](./DEPLOYMENT.md) + [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

**API Consumer?**
→ Start with [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**Want to Contribute?**
→ Start with [CONTRIBUTING.md](./CONTRIBUTING.md)

### By Task

**Setting Up Local Development**
1. [Main README](../README.md#quick-start) - Quick start
2. [BACKEND_GUIDE.md](./BACKEND_GUIDE.md#setup--installation) - Backend setup
3. [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md#setup--installation) - Frontend setup

**Understanding the System**
1. [ARCHITECTURE.md](./ARCHITECTURE.md#system-overview) - System overview
2. [ARCHITECTURE.md](./ARCHITECTURE.md#data-flow-diagrams) - Data flows
3. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Data models

**Adding New Features**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand system
2. Relevant guide: [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) or [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
3. [CONTRIBUTING.md](./CONTRIBUTING.md#development-workflow) - Workflow
4. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference

**Deploying to Production**
1. [DEPLOYMENT.md](./DEPLOYMENT.md#pre-deployment-checklist) - Checklist
2. [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment options
3. [DEPLOYMENT.md](./DEPLOYMENT.md#monitoring--logging) - Monitoring
4. [DEPLOYMENT.md](./DEPLOYMENT.md#scaling) - Scaling

**Fixing Bugs/Issues**
1. [BACKEND_GUIDE.md](./BACKEND_GUIDE.md#debugging) - Backend debugging
2. [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md#debugging-in-vs-code) - Frontend debugging
3. [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) - Troubleshooting

---

## 📖 Document Details

| Document | Focus | Length | Read Time |
|----------|-------|--------|-----------|
| ARCHITECTURE.md | System design, data flows | 15 sections | 20-30 min |
| API_DOCUMENTATION.md | API endpoints, examples | 20+ endpoints | 30-45 min |
| BACKEND_GUIDE.md | Backend dev, setup, testing | 11 sections | 30-40 min |
| FRONTEND_GUIDE.md | Frontend dev, components, state | 11 sections | 30-40 min |
| DATABASE_SCHEMA.md | MongoDB collections, models | 6 collections | 25-35 min |
| DEPLOYMENT.md | Production deployment, ops | 10 sections | 40-60 min |
| CONTRIBUTING.md | Contribution guidelines | 10 sections | 20-30 min |

---

## 🔍 Key Concepts

### Architecture Layers
- **Presentation**: Next.js React frontend (TypeScript)
- **Application**: FastAPI backend (Python)
- **Data**: MongoDB database (JSON documents)
- **External**: Anthropic Claude API (LLM)

### Main Collections
- `users` - User accounts
- `documents` - Uploaded invoices
- `extraction_runs` - LLM extraction results
- `review_versions` - User reviews/approvals
- `audit_events` - Activity logs
- `tenants` - Multi-tenant organizations

### Key APIs
- **POST /auth/login** - User authentication
- **POST /documents/upload** - Upload invoice
- **POST /extraction/extract** - Extract fields using LLM
- **GET /activity/by-email** - User activity history
- **GET /versions/latest** - Latest extraction

### Main Components
- **Dashboard** - Main application hub
- **PDFViewer** - Document visualization
- **ExtractedFields** - Extraction results display
- **VersionHistory** - Document versions

---

## 🛠️ Common Tasks

### I want to...

**Add a new API endpoint**
1. Read: [BACKEND_GUIDE.md#adding-a-new-api-endpoint](./BACKEND_GUIDE.md#adding-a-new-api-endpoint)
2. Create route in `backend/app/api/`
3. Document in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. Update schema if needed in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

**Add a new React component**
1. Read: [FRONTEND_GUIDE.md#components](./FRONTEND_GUIDE.md#components)
2. Create in `frontend/components/`
3. Import and use in pages
4. Add tests in `__tests__/`

**Deploy to production**
1. Read: [DEPLOYMENT.md#pre-deployment-checklist](./DEPLOYMENT.md#pre-deployment-checklist)
2. Choose deployment option: [DEPLOYMENT.md#backend-deployment](./DEPLOYMENT.md#backend-deployment)
3. Follow setup steps
4. Monitor: [DEPLOYMENT.md#monitoring--logging](./DEPLOYMENT.md#monitoring--logging)

**Debug an issue**
1. Check [DEPLOYMENT.md#troubleshooting](./DEPLOYMENT.md#troubleshooting)
2. For backend: [BACKEND_GUIDE.md#debugging](./BACKEND_GUIDE.md#debugging)
3. For frontend: [FRONTEND_GUIDE.md#development-workflow](./FRONTEND_GUIDE.md#development-workflow)

**Understand data flow**
1. Read: [ARCHITECTURE.md#data-flow-diagrams](./ARCHITECTURE.md#data-flow-diagrams)
2. Check: [DATABASE_SCHEMA.md#relationships--foreign-keys](./DATABASE_SCHEMA.md#relationships--foreign-keys)

---

## 🔗 External Resources

### Official Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [React Documentation](https://react.dev)

### Tools & Libraries
- [Beanie ODM](https://beanie-odm.readthedocs.io/)
- [Pydantic](https://docs.pydantic.dev/)
- [pytest](https://docs.pytest.org/)
- [Testing Library](https://testing-library.com/)

### Deployment
- [Docker Docs](https://docs.docker.com/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)

---

## 📝 Viewing Documentation

### Online Viewing
- View in GitHub repository
- Raw markdown files

### Local Viewing
```bash
# Using VS Code
code docs/ARCHITECTURE.md

# Using markdown viewer
# Install: https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
```

### Command Line
```bash
# Linux/Mac
cat docs/ARCHITECTURE.md

# Windows PowerShell
Get-Content docs/ARCHITECTURE.md
```

---

## 📤 Contributing to Docs

Found an issue or want to improve documentation?

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Make changes in appropriate doc file
3. Create pull request
4. Follow [CONTRIBUTING.md#pull-request-process](./CONTRIBUTING.md#pull-request-process)

---

## 📋 Documentation Checklist

Before committing code, update docs if:

- [ ] New API endpoint added → Update [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [ ] New model created → Update [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [ ] Architecture changed → Update [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] New feature added → Update main [README.md](../README.md#features)
- [ ] New component created → Update [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
- [ ] New service created → Update [BACKEND_GUIDE.md](./BACKEND_GUIDE.md)
- [ ] Deployment steps changed → Update [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Need Help?

**Can't find what you're looking for?**
1. Search docs using Ctrl+F (in file) or Cmd+F (Mac)
2. Check [Quick Navigation](#-quick-navigation) above
3. Search in main [README.md](../README.md)
4. Create GitHub issue

**Found an error in docs?**
1. Create pull request with fix
2. Or create issue describing error

---

## 📊 Documentation Stats

```
Total Documents: 7
Total Sections: 75+
Total Words: 40,000+
Last Updated: January 2024
Version: 1.0
```

---

## 🎯 Next Steps

1. **New to the project?** → Start with [Main README](../README.md)
2. **Setting up locally?** → Go to [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) + [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
3. **Want to contribute?** → Read [CONTRIBUTING.md](./CONTRIBUTING.md)
4. **Building features?** → Check [ARCHITECTURE.md](./ARCHITECTURE.md)
5. **Deploying?** → Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Happy coding! 🚀**

