# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ChartImpact** is a full-stack web application that helps teams understand potentially disruptive Helm chart changes before deployment. It compares two versions of a Helm chart and surfaces availability and security risk signals.

- **Frontend**: Next.js 16 (App Router), React 18, TypeScript, TailwindCSS — runs on port 3000
- **Backend**: Go REST API using Helm SDK and internal diff engine — runs on port 8080
- **Database**: PostgreSQL 15 (optional, enables stored results and analytics)

## Commands

### Frontend (`/frontend`)
```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # Jest tests
npm run test:watch   # Jest in watch mode
npm run test:e2e     # Playwright E2E tests
npm run test:coverage
```

Run a single Jest test file:
```bash
npm test -- --testPathPattern=<filename>
```

### Backend (`/backend`)
```bash
go run cmd/server/main.go     # Dev server (port 8080)
go test ./...                 # All tests
go test ./internal/diff/...   # Single package
go test -run TestFuncName ./...  # Single test
go test -race ./...           # Race detector
go build -o server cmd/server # Build binary
```

### Full Stack
```bash
docker-compose up   # Start frontend + backend + postgres
```

Health check: `curl http://localhost:8080/api/health`

## Architecture

### Request Flow
1. User submits: repo URL, chart path, two versions, optional values file
2. Backend shallow-clones the repo, renders Helm manifests for each version
3. Internal diff engine (`internal/diff/`) compares rendered YAML, returns structured JSON
4. Frontend displays results in **Classic view** (text diff) or **Explorer view** (structured, resource-level)
5. Results optionally stored (disk or PostgreSQL) with 30-day TTL

### Backend (`/backend`)
- **Entry point**: `cmd/server/main.go` — sets up Gorilla Mux routing, middleware, storage
- **Handlers**: `internal/api/handlers/` — `compare.go`, `versions.go`, `health.go`, `analysis.go`
- **Helm service**: `internal/service/helm.go` — chart rendering and repo operations
- **Diff engine**: `internal/diff/` — Kubernetes-aware YAML comparison; enabled by default via `INTERNAL_DIFF_ENABLED=true`
- **Storage**: `internal/storage/` — plugin interface with `disk.go` and `postgres.go` implementations

### Frontend (`/frontend`)
- **Pages**: `app/page.tsx` (main), `app/demo/` (mock data, no backend needed), `app/analysis/[id]/` (stored result replay), `app/analytics/`
- **Components**: `components/CompareForm.tsx`, `components/DiffDisplay.tsx`, `components/explorer/` (Explorer v2)
- **Lib**: `lib/api-client.ts` (backend calls), `lib/risk-assessment.ts` (client-side risk signals), `lib/url-state.ts` (shareable URL state), `lib/types.ts`

### Storage Plugin System
Controlled by env vars `STORAGE_ENABLED` and `STORAGE_TYPE` (disk | postgres). The storage interface (`internal/storage/interface.go`) makes it easy to swap implementations.

### Risk Assessment
Risk signals (availability, security) are computed **client-side** in `lib/risk-assessment.ts` from the structured diff returned by the API. No risk logic lives in the backend.

## Key Configuration

**Backend** (`backend/.env.example`): `PORT`, `CORS_ALLOWED_ORIGINS`, `COMPARE_TIMEOUT`, `VERSIONS_TIMEOUT`, `INTERNAL_DIFF_ENABLED`, `STORAGE_ENABLED`, `STORAGE_TYPE`, `DATABASE_URL`

**Frontend** (`frontend/.env.example`): Only `NEXT_PUBLIC_API_URL` (points to backend)

## Testing

- Backend tests use Go's built-in testing + testify; run with race detector in CI
- Frontend unit/integration tests use Jest + React Testing Library
- E2E tests use Playwright (`/frontend/e2e/`); require a running backend (disabled in CI by default)
- CI runs backend and frontend test jobs independently based on path changes (`.github/workflows/ci.yml`)

## Git Conventions

- **Commits**: Conventional commits — `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`
- **Branches**: `feature/`, `fix/`, `docs/`, `refactor/` prefixes
- **Releases**: Git tags `v*.*.*` trigger the release workflow
