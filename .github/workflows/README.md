# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation and security scanning.

## Available Workflows

### 1. `ci.yml` - Continuous Integration
**Triggers:** Pull Requests (with path filtering)

**Path Filters:**
- `backend/**` - Backend code changes
- `frontend/**` - Frontend code changes
- `docker-compose.yml` - Docker configuration changes
- `.github/workflows/ci.yml` - Workflow changes

**Jobs:**
- **changes**: Detects which parts of the codebase changed
- **test-backend**: Runs Go tests, race detection, coverage (only on backend changes)
- **test-frontend**: Runs frontend linting, type checking, and tests (only on frontend changes)
- **build-backend**: Builds Go backend binary (only on backend changes)
- **build-frontend**: Builds Next.js application (only on frontend changes)
- **docker-build**: Builds Docker images (on main branch only, conditional on changes)

**Features:**
- Automated testing on every PR
- Path-based job filtering to run only relevant checks
- Code coverage reporting (Codecov)
- Build verification for both backend and frontend
- Docker image validation
- Reduced CI runtime for focused changes

### 2. `frontend-tests.yml` - Frontend Test Suite
**Triggers:** Pull Requests (with path filtering)

**Path Filters:**
- `frontend/**` - Frontend code changes
- `.github/workflows/frontend-tests.yml` - Workflow changes

**Jobs:**
- **unit-tests**: Jest unit tests with coverage
- **integration-tests**: DiffExplorer integration tests
- **e2e-tests**: Playwright end-to-end tests (commented out, requires running backend)
- **regression-check**: Explorer v2 regression validation

**Features:**
- Comprehensive frontend testing
- Multiple test layers (unit, integration, E2E)
- Regression prevention for Explorer v2

### 3. `codeql.yml` - CodeQL Security Analysis
**Triggers:** Push to main, Pull Requests (with path filtering), Weekly schedule (Mondays)

**Path Filters (Pull Requests only):**
- `backend/**` - Backend code changes
- `frontend/**` - Frontend code changes
- `.github/workflows/codeql.yml` - Workflow changes

**Jobs:**
- **changes**: Detects which parts of the codebase changed (pull requests only)
- **analyze-go**: Scans Go backend for security vulnerabilities (only on backend changes or schedule)
- **analyze-javascript**: Scans TypeScript/JavaScript frontend for security vulnerabilities (only on frontend changes or schedule)

**Features:**
- Automated security scanning
- Path-based analysis to scan only affected code on PRs
- Full scan on scheduled runs
- Security query suite
- Results uploaded to GitHub Security tab

### 4. `scorecard.yml` - OpenSSF Scorecard
**Triggers:** Push to main, Weekly schedule (Saturdays), Manual

**Features:**
- Open Source Security Foundation best practices assessment
- Results published to OpenSSF REST API
- SARIF results uploaded to GitHub Security tab
- Tracks security posture over time

### 5. `release.yml` - Release Workflow
**Triggers:** When a tag matching `v*.*.*` is pushed (e.g., `v1.0.0`), or manual workflow dispatch

**Jobs:**
- **detect-changes**: Detects which components (backend/frontend) changed since last release
- **test-backend**: Backend tests before release (only if backend changed)
- **test-frontend**: Frontend tests before release (only if frontend changed)
- **build-backend**: Build Linux AMD64 and ARM64 binaries (only if backend changed)
- **build-frontend**: Build Next.js application (only if frontend changed)
- **docker-release**: Build and push multi-platform Docker images to GitHub Container Registry (conditional based on changes)
- **create-release**: Create GitHub release with binaries and enhanced release notes

**Features:**
- **Intelligent Change Detection**: Only builds Docker images for components that changed
- **Workflow Summaries**: Clear visibility into which components were released
- **Enhanced Release Notes**: Shows which components were updated in each release
- **Resource Optimization**: Skips unnecessary builds to save CI time and registry storage
- **Unified Versioning**: Maintains single version number (v1.x.x) for project releases

**Usage:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Documentation:** See [docs/WORKFLOW_RELEASE_REVIEW.md](../../docs/WORKFLOW_RELEASE_REVIEW.md) for detailed analysis and [docs/RELEASE_WORKFLOW_RECOMMENDATIONS.md](../../docs/RELEASE_WORKFLOW_RECOMMENDATIONS.md) for implementation details.

## Workflow Status Badges

[![CI/CD Pipeline](https://github.com/dcotelo/ChartImpact/actions/workflows/ci.yml/badge.svg)](https://github.com/dcotelo/ChartImpact/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dcotelo/ChartImpact/actions/workflows/codeql.yml/badge.svg)](https://github.com/dcotelo/ChartImpact/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/dcotelo/ChartImpact/badge)](https://securityscorecards.dev/viewer/?uri=github.com/dcotelo/ChartImpact)

## Path-Based Workflow Filtering

To reduce unnecessary CI runs and improve feedback loops, workflows are configured to run only when relevant paths change.

### Path Ownership Mapping

| Path Pattern | Triggers | Purpose |
|--------------|----------|---------|
| `backend/**` | CI backend jobs, CodeQL Go analysis | Backend API code, tests, configs |
| `frontend/**` | CI frontend jobs, Frontend tests, CodeQL JS analysis | Frontend app code, tests, configs |
| `docker-compose.yml` | CI backend & frontend jobs | Affects both backend and frontend |
| `.github/workflows/*.yml` | Respective workflow | Workflow configuration changes |
| `*.md` (docs) | _No workflows_ | Documentation-only changes |
| `README.md`, `CONTRIBUTING.md`, etc. | _No workflows_ | Project documentation |

### Workflow Behavior

**On Pull Requests:**
- **Backend-only changes**: Only backend tests, build, and Go CodeQL analysis run
- **Frontend-only changes**: Only frontend tests, build, and JavaScript CodeQL analysis run
- **Documentation-only changes**: No CI workflows run (except scheduled scans)
- **Multi-path changes**: All affected workflows run
- **Shared config changes** (e.g., `docker-compose.yml`): Both backend and frontend workflows run

**On Scheduled Runs:**
- CodeQL runs full analysis on all code (not path-filtered)
- OpenSSF Scorecard runs full assessment

**On Releases:**
- Change detection determines which components changed since last release
- Only changed components are tested, built, and have Docker images published
- Release notes clearly indicate which components were updated
- Unchanged components skip build steps to optimize CI time

### Benefits

✅ **Faster Feedback**: Only relevant checks run, reducing wait time  
✅ **Clearer Signal**: PR checks directly relate to changes made  
✅ **Reduced Costs**: Fewer compute minutes used  
✅ **Better DX**: Contributors see only relevant test results  
✅ **Efficient Releases**: Release workflow skips unchanged components, saving 5-10 minutes per release  
✅ **Clear Release Audit Trail**: Workflow summaries and release notes show exactly what changed

### Edge Cases Handled

- **Shared files** (`docker-compose.yml`): Triggers both backend and frontend
- **Workflow changes**: Triggers the respective workflow to validate the change
- **Multiple directory changes**: Runs all relevant workflows
- **Schedule events**: Full scans run regardless of recent changes

## Security Features

### CodeQL Analysis
- Scans both Go and TypeScript/JavaScript code
- Runs security and quality queries
- Results visible in GitHub Security tab
- Scheduled weekly scans

### OpenSSF Scorecard
- Evaluates project against security best practices
- Checks for:
  - Security policy
  - Dependency updates
  - Branch protection
  - Code review requirements
  - Signed releases
  - And many more security indicators
- Results published publicly
- Weekly automated scoring

## Setting Up Workflows

### No Additional Setup Required

All workflows are configured to work out of the box. They use:
- GitHub-provided secrets (automatically available)
- No external service authentication needed
- Standard GitHub Actions features

## Troubleshooting

### Tests Failing
- Check that all dependencies are in `go.mod` and `package.json`
- Ensure test environment variables are set if needed
- Review test output in Actions tab

### Build Failing
- Verify Go version matches `go.mod` requirements
- Verify Node.js version matches `package.json` engines
- Check for TypeScript errors: `npm run type-check`
- Review build logs in Actions tab

### Security Alerts
- Review CodeQL findings in Security tab
- Check OpenSSF Scorecard recommendations
- Address high-priority security issues promptly
