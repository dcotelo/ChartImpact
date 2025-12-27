# Contributing to ChartImpact

Thank you for your interest in contributing to ChartImpact! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Architecture Guidelines](#architecture-guidelines)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/ChartImpact.git
   cd ChartImpact
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/dcotelo/ChartImpact.git
   ```

## Development Setup

### Prerequisites

- **Docker and Docker Compose** (recommended)
- **Go 1.21+** (for backend development)
- **Node.js 18+** and **npm 9+** (for frontend development)
- **Helm 3.x** (for testing)
- **Git**

### Quick Start with Docker Compose

```bash
docker-compose up
```

This starts both backend (port 8080) and frontend (port 3000) services.

### Local Development

**Backend:**
```bash
cd backend
cp .env.example .env
go mod download
go run cmd/server/main.go
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

See [GETTING_STARTED.md](GETTING_STARTED.md) for detailed setup instructions.

## Making Changes

### Creating a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/add-filtering` - New features
- `fix/explorer-rendering` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/api-cleanup` - Code refactoring

### Commit Messages

Write clear, concise commit messages:

```
feat: add resource filtering to Explorer view

- Implement client-side filtering by resource type
- Add search functionality for resource names
- Update tests for new filtering logic
```

Format:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Test additions or modifications
- **refactor**: Code refactoring
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

## Testing

### Backend Tests

```bash
cd backend
go test ./...
go test -race ./...
go test -cover ./...
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
npm run lint
npm run type-check
```

### End-to-End Tests

```bash
cd frontend
npm run test:e2e
```

**All tests must pass before submitting a PR.**

## Submitting Changes

1. **Ensure tests pass**: Run all tests locally
2. **Update documentation**: If you changed behavior, update relevant docs
3. **Commit your changes**: Follow commit message guidelines
4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Create a Pull Request**: Go to the original repository and create a PR

### Pull Request Guidelines

- **Title**: Clear, concise description of changes
- **Description**: 
  - What does this PR do?
  - Why is this change needed?
  - How was it tested?
  - Any breaking changes?
- **Link related issues**: Use "Closes #123" or "Fixes #456"
- **Keep PRs focused**: One feature or fix per PR
- **Update tests**: Add or update tests for your changes

### PR Review Process

1. Automated checks will run (CI, linting, tests)
2. Maintainers will review your code
3. Address any feedback or requested changes
4. Once approved, your PR will be merged

## Code Style

### Go (Backend)

- Follow standard Go conventions
- Use `gofmt` for formatting
- Run `go vet` to catch common errors
- Keep functions focused and small
- Write descriptive comments for exported functions

```go
// Good
func ParseManifest(data []byte) (*Manifest, error) {
    // Implementation
}

// Bad
func parse(d []byte) (*Manifest, error) {
    // Implementation
}
```

### TypeScript/React (Frontend)

- Follow the existing code style
- Use TypeScript for type safety
- Prefer functional components with hooks
- Keep components small and focused
- Use meaningful variable and function names

```typescript
// Good
const [isLoading, setIsLoading] = useState<boolean>(false);

// Bad
const [x, setX] = useState(false);
```

### General Guidelines

- **DRY**: Don't Repeat Yourself - extract common logic
- **KISS**: Keep It Simple, Stupid - avoid unnecessary complexity
- **YAGNI**: You Aren't Gonna Need It - don't add unused features
- **Comments**: Explain *why*, not *what*
- **Error handling**: Always handle errors appropriately

## Architecture Guidelines

### Backend Architecture

```
backend/
├── cmd/server/       # Application entry point
├── internal/
│   ├── api/         # HTTP handlers and middleware
│   ├── diff/        # Diff engine
│   ├── service/     # Business logic
│   ├── models/      # Data models
│   └── util/        # Utilities
```

**Key principles:**
- Keep business logic in `service/`
- HTTP concerns stay in `api/handlers/`
- Diff logic is isolated in `diff/`
- Use interfaces for testability

### Frontend Architecture

```
frontend/
├── app/              # Next.js pages and API routes
├── components/       # React components
│   ├── explorer/    # Explorer view components
│   └── __tests__/   # Component tests
├── lib/             # Utilities and shared code
└── types/           # TypeScript type definitions
```

**Key principles:**
- **Single Source of Truth**: All views use the same data source
- **Client-side filtering**: Filtering happens in the browser, not the backend
- **Separation of concerns**: UI components don't contain business logic
- **Testable**: Components are designed for easy testing

### Architectural Boundaries

1. **Render vs Filter**:
   - Backend: Renders charts and computes diffs
   - Frontend: Filters and presents the diff data

2. **Classic vs Explorer Views**:
   - Both consume the same comparison response
   - No duplicate API calls
   - Explorer provides enhanced filtering/navigation

3. **Demo Mode**:
   - Demo mode is frontend-only
   - Uses mock data for demonstration
   - Clearly marked with "DEMO MODE" badge

## Adding New Features

When adding features:

1. **Discuss first**: Open an issue to discuss major features before implementing
2. **Start small**: Break large features into smaller, reviewable chunks
3. **Write tests**: Add tests for new functionality
4. **Update docs**: Document new features in README or relevant docs
5. **Consider backward compatibility**: Don't break existing functionality

## Reporting Issues

When reporting bugs:

- **Search first**: Check if the issue already exists
- **Provide details**:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment (OS, Go version, Node version)
  - Error messages or logs
- **Minimal example**: Provide the smallest example that reproduces the issue

## Questions?

- **General questions**: Open a [Discussion](https://github.com/dcotelo/ChartImpact/discussions)
- **Bug reports**: Open an [Issue](https://github.com/dcotelo/ChartImpact/issues)
- **Feature requests**: Open an [Issue](https://github.com/dcotelo/ChartImpact/issues) with the "enhancement" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ChartImpact! 🎉
