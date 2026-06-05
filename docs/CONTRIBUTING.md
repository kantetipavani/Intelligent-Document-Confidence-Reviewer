# Contributing Guide

Guidelines for contributing to the INDCR project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing](#testing)
8. [Documentation](#documentation)
9. [Performance Guidelines](#performance-guidelines)
10. [Security Guidelines](#security-guidelines)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors are expected to:

- Respect diverse perspectives and experiences
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### 1. Fork & Clone

```bash
# Fork on GitHub
# Clone your fork
git clone https://github.com/your-username/indcr.git
cd indcr

# Add upstream remote
git remote add upstream https://github.com/original-org/indcr.git
```

### 2. Create Branch

```bash
# Fetch latest
git fetch upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

Branch naming convention:
- `feature/add-export-function`
- `fix/extraction-timeout`
- `docs/update-readme`
- `test/add-unit-tests`
- `chore/update-deps`

### 3. Setup Local Environment

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with local settings
python -m uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Development Workflow

### 1. Make Changes

- Write code following project conventions
- Keep changes focused and atomic
- Run tests frequently
- Update documentation

### 2. Test Locally

Backend:
```bash
cd backend
pytest                              # Run all tests
pytest tests/test_specific.py -v   # Run specific test
pytest --cov=app                   # Coverage report
black app/                         # Format code
ruff check app/                    # Lint code
mypy app/                          # Type check
```

Frontend:
```bash
cd frontend
npm run lint                        # ESLint
npm run type-check                  # TypeScript
npm test                            # Unit tests
npm run build                       # Build test
```

### 3. Commit Changes

Use conventional commits:
```bash
git commit -m "feat: add extraction retry logic"
git commit -m "fix: correct confidence score calculation"
git commit -m "docs: update API documentation"
git commit -m "test: add extraction service tests"
git commit -m "chore: update dependencies"
```

### 4. Push & Create PR

```bash
git push origin feature/your-feature-name
```

Create Pull Request on GitHub with:
- Clear description of changes
- Link to related issues
- Screenshots (if UI changes)
- Checklist completed

---

## Coding Standards

### Python (Backend)

**Naming Conventions:**
```python
# Functions & variables: snake_case
def extract_invoice_fields():
    pass

# Classes: PascalCase
class ExtractionService:
    pass

# Constants: UPPER_SNAKE_CASE
EXTRACTION_TIMEOUT = 30
```

**Code Style:**
```python
# Format with Black
black app/

# Lint with Ruff
ruff check app/ --fix

# Type hints
def extract_document(doc_id: str) -> dict:
    """Extract fields from document.
    
    Args:
        doc_id: Document identifier
        
    Returns:
        Dictionary of extracted fields with confidence
    """
    pass
```

**Docstring Format:**
```python
def calculate_confidence(extractions: list) -> float:
    """Calculate average confidence score.
    
    Processes extraction results and returns the average
    confidence across all fields.
    
    Args:
        extractions: List of extraction results
        
    Returns:
        Average confidence score (0-1)
        
    Raises:
        ValueError: If extractions list is empty
        
    Example:
        >>> score = calculate_confidence([0.95, 0.87])
        >>> score
        0.91
    """
    if not extractions:
        raise ValueError("Extractions list cannot be empty")
    return sum(extractions) / len(extractions)
```

**Error Handling:**
```python
from fastapi import HTTPException

try:
    result = await extract_fields(document)
except ValueError as e:
    logger.error("Extraction failed", error=str(e))
    raise HTTPException(status_code=422, detail=str(e))
except Exception as e:
    logger.exception("Unexpected error during extraction")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### TypeScript (Frontend)

**Naming Conventions:**
```typescript
// Functions & variables: camelCase
function extractFields() {
    return {};
}

// Interfaces/Types: PascalCase
interface ExtractedField {
    value: string;
    confidence: number;
}

// Constants: UPPER_SNAKE_CASE or camelCase
const API_TIMEOUT = 30000;
const defaultPageSize = 20;
```

**Type Annotations:**
```typescript
// Always use types
function uploadDocument(file: File, email: string): Promise<Document> {
    return api.post("/upload", { file, email });
}

// Interface definitions
interface ApiResponse<T> {
    data: T;
    message: string;
    timestamp: Date;
}

// Generics
function formatResponse<T>(data: T): ApiResponse<T> {
    return {
        data,
        message: "Success",
        timestamp: new Date(),
    };
}
```

**React Components:**
```typescript
import React from "react";

interface ComponentProps {
    title: string;
    onClose?: () => void;
    items?: Array<Item>;
}

export default function Component({
    title,
    onClose,
    items = [],
}: ComponentProps): JSX.Element {
    return (
        <div>
            <h1>{title}</h1>
        </div>
    );
}
```

---

## Commit Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build process, dependencies

### Scope
- `backend`: Backend changes
- `frontend`: Frontend changes
- `api`: API endpoints
- `db`: Database related
- `auth`: Authentication
- `extraction`: Extraction logic

### Subject
- Use imperative, present tense ("add" not "added")
- Don't capitalize first letter
- No period at end
- Limit to 50 characters

### Examples

```
feat(extraction): add retry logic for failed extractions

fix(api): correct authentication token validation

docs(backend): update database schema documentation

refactor(frontend): simplify form submission logic

perf(api): add database indexes for query optimization

test(extraction): add unit tests for field extraction

chore(deps): update dependencies to latest versions
```

---

## Pull Request Process

### 1. Before Creating PR

- [ ] Code follows project style guide
- [ ] Tests pass locally
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] Commits are clean and descriptive
- [ ] No unrelated changes

### 2. Create PR

```markdown
## Description
Brief description of changes

## Related Issues
Fixes #123
Closes #456

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No breaking changes
```

### 3. Code Review

- Address reviewer comments constructively
- Push new commits (don't force push)
- Re-request review after changes
- Maintain professional tone

### 4. Merge

- Ensure all checks pass
- Squash commits if appropriate
- Delete feature branch
- Thank reviewers

---

## Testing

### Backend Testing

**Unit Tests:**
```python
import pytest

@pytest.mark.asyncio
async def test_extract_invoice_fields():
    """Test invoice field extraction."""
    llm = MockLLM()
    service = ExtractionService(llm)
    
    result = await service.extract_document("doc_123")
    
    assert result.status == "completed"
    assert "invoice_number" in result.extraction
```

**Integration Tests:**
```python
@pytest.mark.asyncio
async def test_upload_and_extract(client):
    """Test full upload & extraction flow."""
    # Upload
    response = client.post("/documents/upload", data={...})
    assert response.status_code == 201
    
    # Extract
    doc_id = response.json()["document_id"]
    response = client.post(f"/extraction/{doc_id}")
    assert response.status_code == 200
```

**Test Coverage:**
```bash
pytest --cov=app tests/
# Target: >80% coverage
```

### Frontend Testing

**Unit Tests:**
```typescript
import { render, screen } from "@testing-library/react";
import ExtractedFields from "./ExtractedFields";

describe("ExtractedFields", () => {
    it("displays fields", () => {
        render(<ExtractedFields fields={{ test: "value" }} />);
        expect(screen.getByText("value")).toBeInTheDocument();
    });
});
```

**Integration Tests:**
```typescript
it("uploads and displays results", async () => {
    render(<Dashboard />);
    
    const file = new File(["content"], "test.pdf");
    const input = screen.getByTestId("file-input");
    
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Extract"));
    
    await waitFor(() => {
        expect(screen.getByText("Extraction complete")).toBeInTheDocument();
    });
});
```

---

## Documentation

### Code Comments

```python
# Good: Explains why, not what
# Retry extraction with exponential backoff to handle
# temporary API rate limiting
for attempt in range(max_attempts):
    try:
        return await extract_fields(doc)
    except RateLimitError:
        await asyncio.sleep(2 ** attempt)

# Bad: Obvious comments
# Increment counter
count += 1
```

### Update Documentation

When adding features:
1. Update README if user-facing
2. Add API documentation
3. Add architecture notes
4. Update changelog

### Documentation Files

- `README.md` - Project overview
- `docs/ARCHITECTURE.md` - System design
- `docs/API_DOCUMENTATION.md` - API reference
- `docs/BACKEND_GUIDE.md` - Backend development
- `docs/FRONTEND_GUIDE.md` - Frontend development
- `docs/DATABASE_SCHEMA.md` - Data models
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/CONTRIBUTING.md` - This file

---

## Performance Guidelines

### Backend

1. **Use indexes** for frequently queried fields
2. **Batch operations** instead of loops
3. **Cache results** for expensive operations
4. **Use async/await** for I/O operations
5. **Monitor query performance**

```python
# Bad: N+1 queries
for doc in documents:
    user = await User.get(doc.user_email)

# Good: Single batch query
emails = [doc.user_email for doc in documents]
users = await User.find(User.email.in_(emails)).to_list()
```

### Frontend

1. **Code split** large components
2. **Memoize** expensive calculations
3. **Lazy load** images
4. **Minimize bundle** size
5. **Avoid unnecessary re-renders**

```typescript
// Bad: Re-renders on every keystroke
function SearchPage() {
    const [search, setSearch] = useState("");
    const results = searchDocuments(search); // Called on every render
    
    return <input onChange={(e) => setSearch(e.target.value)} />;
}

// Good: Memoized callback
const results = useMemo(() => searchDocuments(search), [search]);
```

---

## Security Guidelines

### Never Commit

- API keys or secrets
- Database credentials
- Personal information
- Sensitive configuration

### Use Environment Variables

```python
# Good
API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Bad
API_KEY = "sk-ant-xxx"  # Never do this
```

### Input Validation

```python
# Always validate user input
from pydantic import BaseModel, EmailStr

class UploadRequest(BaseModel):
    email: EmailStr
    file_size: int
    
    @validator('file_size')
    def validate_file_size(cls, v):
        if v > 50_000_000:  # 50MB max
            raise ValueError('File too large')
        return v
```

### SQL Injection Prevention

- Always use parameterized queries
- Never concatenate user input into queries
- MongoDB: Beanie ORM handles this automatically

---

## Questions?

- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub discussions
- **Email**: team@indcr.com
- **Slack**: #indcr-dev channel

---

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Invited to community calls

Thank you for contributing!

