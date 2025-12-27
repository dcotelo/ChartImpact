# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation and security scanning.

## Available Workflows

### 1. `ci.yml` - Continuous Integration
**Triggers:** Pull Requests

**Jobs:**
- **test-backend**: Runs Go tests, race detection, coverage
- **test-frontend**: Runs frontend linting, type checking, and tests
- **build-backend**: Builds Go backend binary
- **build-frontend**: Builds Next.js application
- **docker-build**: Builds Docker images (on main branch only)

**Features:**
- Automated testing on every PR
- Code coverage reporting (Codecov)
- Build verification for both backend and frontend
- Docker image validation

### 2. `frontend-tests.yml` - Frontend Test Suite
**Triggers:** Pull Requests

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
**Triggers:** Push to main/develop, Pull Requests, Weekly schedule (Mondays)

**Jobs:**
- **analyze-go**: Scans Go backend for security vulnerabilities
- **analyze-javascript**: Scans TypeScript/JavaScript frontend for security vulnerabilities

**Features:**
- Automated security scanning
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
**Triggers:** When a tag matching `v*.*.*` is pushed (e.g., `v1.0.0`)

**Jobs:**
- **test-backend**: Backend tests before release
- **test-frontend**: Frontend tests before release
- **build-backend**: Build Linux AMD64 and ARM64 binaries
- **build-frontend**: Build Next.js application
- **docker-release**: Build and push multi-platform Docker images to GitHub Container Registry
- **create-release**: Create GitHub release with binaries

**Usage:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Workflow Status Badges

[![CI/CD Pipeline](https://github.com/dcotelo/ChartImpact/actions/workflows/ci.yml/badge.svg)](https://github.com/dcotelo/ChartImpact/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dcotelo/ChartImpact/actions/workflows/codeql.yml/badge.svg)](https://github.com/dcotelo/ChartImpact/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/dcotelo/ChartImpact/badge)](https://securityscorecards.dev/viewer/?uri=github.com/dcotelo/ChartImpact)

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
