# Testing Guide

This guide covers how to test ChartImpact, including both backend and frontend testing.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Explorer Testing](#explorer-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Manual Testing](#manual-testing)
- [CI/CD Testing](#cicd-testing)

## Prerequisites

Before running tests, ensure you have:

1. **Node.js 18+** and **npm 9+** installed (for frontend)
2. **Go 1.21+** installed (for backend)
3. **Dependencies installed**: Run `npm install` in frontend and `go mod download` in backend

## Backend Testing

### Running Go Tests

```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run with verbose output
go test -v ./...

# Run with race detection
go test -race ./...
```

### Test Structure

Backend tests are located alongside the code they test:
- `internal/diff/diff_test.go` - Internal diff engine tests
- `internal/service/helm_test.go` - Helm service tests
- `internal/api/handlers/*_test.go` - API handler tests

### Key Test Areas

1. **Diff Engine** - Tests for Kubernetes-aware diffing
2. **Helm Operations** - Chart rendering and comparison
3. **API Endpoints** - Request validation and error handling
4. **Git Operations** - Repository cloning and version fetching

## Frontend Testing

Frontend tests use **Jest** and **React Testing Library** for unit and integration tests, plus **Playwright** for E2E tests.

### Running Jest Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- DiffExplorer.test.tsx
```

### Test Structure

```
frontend/
├── components/__tests__/         # Component tests
│   ├── CompareForm.test.tsx
│   ├── DiffDisplay.test.tsx
│   ├── DiffExplorer.test.tsx
│   └── DiffExplorer.integration.test.tsx
└── e2e/                         # Playwright E2E tests
    ├── explorer-v2.spec.ts
    └── README.md
```

## Explorer Testing

Explorer has comprehensive test coverage to ensure reliability:

### Automated Tests

Run Explorer tests:
```bash
cd frontend
npm test -- DiffExplorer.test.tsx
```

These tests verify:
- **Demo mode fallback**: Explorer renders with demo data when backend data unavailable
- **Backend data integration**: Explorer uses `structuredDiff` from API responses
- **Mode indicators**: "DEMO MODE" badge displays correctly
- **Blocking message**: Shows only when no data is available
- **Version display**: Correctly shows version information

### Manual Testing - Demo Mode

1. Navigate to `http://localhost:3000/demo`
2. Verify:
   - Explorer renders without backend
   - "DEMO MODE" badge is visible
   - Resource list shows sample data
   - Filtering and navigation work
   - No blocking message appears

### Manual Testing - Real Backend Data

1. Perform a chart comparison from the main page
2. Switch to "Explorer" tab
3. Verify:
   - Explorer renders if backend provides `structuredDiff`
   - No "DEMO MODE" badge (indicates real data)
   - Resources from actual comparison appear
   - Blocking message only if backend doesn't support structured diff

### Backend Structured Diff Testing

Test backend structured diff availability:
```bash
cd backend
go test -v ./internal/service -run TestStructuredDiffAvailableFlag
go test -v ./internal/models -run TestCompareResponse
```

## End-to-End Testing

E2E tests use **Playwright** for browser-based integration testing.

### Running Playwright Tests

```bash
cd frontend

# Run E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run all tests (Jest + Playwright)
npm run test:all
```

### E2E Test Coverage

- Full user workflows (comparison, view switching)
- Backend API integration
- Error handling and edge cases
- Regression prevention

See [frontend/e2e/README.md](frontend/e2e/README.md) for detailed E2E testing documentation.

## Manual Testing

### Starting the Services

**With Docker Compose:**
```bash
docker-compose up
```

**Or start services individually:**

Backend:
```bash
cd backend
go run cmd/server/main.go
```

Frontend:
```bash
cd frontend
npm run dev
```

### Testing the UI

#### Basic Comparison Test

1. Open `http://localhost:3000` in your browser
2. Fill in the form with real repository details or use demo examples
3. Click **Compare Versions**
4. Verify both Classic and Explorer views display correctly

#### Test Explorer View

1. After a successful comparison, switch to the **Explorer** tab
2. Verify:
   - Resource list shows all changed resources
   - Statistics dashboard displays change metrics
   - Filtering and search work correctly
   - Details panel shows field-level changes

#### Test Demo Mode

1. Navigate to `http://localhost:3000/demo`
2. Verify Explorer view renders with demo data
3. Check for "DEMO MODE" badge

### Testing the Backend API Directly

You can test the backend API directly using `curl`:

```bash
curl -X POST http://localhost:8080/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "https://github.com/argoproj/argo-helm.git",
    "chartPath": "charts/argo-cd",
    "version1": "5.0.0",
    "version2": "5.1.0"
  }'
```

Or test the health endpoint:

```bash
curl http://localhost:8080/api/health
```

## Test Coverage

### Frontend Coverage

```bash
cd frontend
npm run test:coverage
```

This generates a coverage report showing:
- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of code branches executed
- **Functions**: Percentage of functions executed
- **Lines**: Percentage of lines executed

### Backend Coverage

```bash
cd backend
go test -cover ./...
```

Backend tests also support coverage reporting.

Coverage reports are generated in the `coverage/` directory for frontend. Open `frontend/coverage/lcov-report/index.html` in a browser for a detailed view.

## CI/CD Testing

The project includes automated testing in CI/CD workflows:

- **ci.yml**: Runs backend and frontend tests on every PR
- **frontend-tests.yml**: Comprehensive frontend testing including:
  - Unit tests (Jest)
  - Integration tests
  - E2E tests (Playwright)
  - Regression checks

Tests must pass before code can be merged. See [`.github/workflows/`](.github/workflows/) for workflow details.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Go Testing](https://golang.org/pkg/testing/)

---

Happy Testing! 🧪

