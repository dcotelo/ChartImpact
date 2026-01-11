![ChartInspect](ChartInspect.png)

# ChartImpact

**Understand potentially disruptive Helm chart changes before deployment.**

ChartImpact helps teams gain clarity and confidence by surfacing availability, rollout risk, and security changes in Helm chart upgrades. Built with a **Go backend** using the Helm SDK and a **Next.js frontend** for a fast, scalable, and maintainable architecture.

[![CI/CD Pipeline](https://github.com/dcotelo/ChartImpact/actions/workflows/ci.yml/badge.svg)](https://github.com/dcotelo/ChartImpact/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dcotelo/ChartImpact/actions/workflows/codeql.yml/badge.svg)](https://github.com/dcotelo/ChartImpact/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/dcotelo/ChartImpact/badge)](https://securityscorecards.dev/viewer/?uri=github.com/dcotelo/ChartImpact)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Mission

ChartImpact provides visibility into Helm chart changes, helping teams understand potential impacts on **availability** and **security** before deployment. We focus on surfacing risk signals with clarity—giving teams the information they need to make confident deployment decisions without imposing judgment or automated enforcement.

## ✨ Current Features

- 🎯 **Impact Summary** - Risk-first results view surfaces availability and security risks with contextual explanations
- 🔍 **Version Comparison** - Compare any two versions (tags, branches, or commits) of a Helm chart
- 📊 **Visual Diff Display** - Beautiful syntax-highlighted diff output powered by internal diff engine
- 🔬 **Interactive Explorer** - Structured diff explorer with client-side filtering and search capabilities
- ⚡ **Risk Signal Visibility** - Understand changes to availability-critical resources (Deployments, StatefulSets, Services)
- 🔐 **Security Impact Awareness** - Surface changes to security-sensitive configurations (RBAC, NetworkPolicies, ServiceAccounts)
- 🔗 **Shareable Links** - URL-based sharing enables team collaboration on comparison results
- 💾 **Result Storage & Replay** - Optional storage: lightweight disk-based caching or full PostgreSQL storage with compression and deduplication
- 📈 **Analytics Dashboard** - Insights into most compared charts, change rates, and deployment risk trends (PostgreSQL storage only)
- 🎨 **Modern UI** - Clean, responsive interface with mission-aligned design and consistent terminology
- 🚀 **Fast & Efficient** - Go backend with Helm Go SDK for optimal performance
- 🔧 **Flexible** - Support for custom values files or inline values content
- 📦 **No External Dependencies** - Internal diff engine eliminates need for dyff
- 🛡️ **Production Ready** - Comprehensive error handling, logging, and health checks

## 📋 Table of Contents

- [Mission](#-mission)
- [Current Features](#-current-features)
- [Impact Measurement](#-impact-measurement)
- [Roadmap](#-roadmap)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)



## 📊 Impact Measurement

ChartImpact uses a sophisticated **risk assessment system** to analyze Helm chart changes and categorize their potential impact. The system automatically detects changes affecting **availability** and **security**, presenting them as contextual risk signals with clear explanations.

### Risk Categories

- **🟢 Availability Impact** - Changes affecting uptime, redundancy, or operational stability
  - Monitored resources: Deployments, StatefulSets, DaemonSets, Services
  - Key signals: Replica count changes, service port changes, resource limits, update strategies

- **🔐 Security Impact** - Changes affecting access control, network security, or security posture
  - Monitored resources: NetworkPolicies, ServiceAccounts, RBAC resources, Secrets
  - Key signals: RBAC permission changes, network policy modifications, security context changes

- **📝 Other Changes** - Configuration changes that may still be significant
  - Examples: Container images, ConfigMaps, labels, environment variables

### Risk Levels

Each change is assigned a risk level:
- **High Risk (🔴)** - Significant potential to disrupt service or compromise security
- **Medium Risk (🟡)** - Requires attention but less likely to cause immediate issues
- **Low Risk (🟢)** - Minor changes unlikely to cause operational issues

### Decision Support, Not Enforcement

ChartImpact provides **clarity and visibility** without imposing judgment:
- ✅ Surfaces what's changing and why it matters
- ✅ Enables informed team decisions
- ✅ Supports collaboration through shareable results
- ❌ Does NOT block deployments or enforce policies
- ❌ Does NOT judge changes as "good" or "bad"

**📖 For detailed information**, see [Impact Measurement Methodology](docs/IMPACT_MEASUREMENT.md)

## 🗺️ Roadmap

We're working on extending ChartImpact's capabilities to provide earlier feedback in the development workflow:

### Planned Features

- **Automated GitHub PR Checks** *(Planned)* - Automated analysis of Helm chart changes in pull requests
- **CI/CD Integration** *(Planned)* - Early workflow feedback during continuous integration
- **Configurable Risk Thresholds** *(Planned)* - Team-defined criteria for highlighting significant changes

These features will maintain our clarity-first philosophy: providing information and visibility without imposing blocking or enforcement mechanisms.

## 🏗️ Architecture

ChartImpact uses a modern separated architecture:

```
┌─────────────────┐         ┌──────────────────┐
│                 │         │                  │
│  Next.js        │  HTTP   │  Go Backend      │
│  Frontend       ├────────►│  (Port 8080)     │
│  (Port 3000)    │         │                  │
│                 │         │  - Helm SDK      │
│  - React UI     │         │  - Git Ops       │
│  - TypeScript   │         │  - Internal Diff │
│                 │         │                  │
└─────────────────┘         └──────────────────┘
```

**Backend** (`/backend`):
- Go 1.21+ with Helm Go SDK
- Internal diff engine for fast, deterministic comparisons
- REST API with gorilla/mux
- Structured logging with logrus
- Docker containerized

**Frontend** (`/frontend`):
- Next.js 14 with App Router
- TypeScript and React 18
- TailwindCSS for styling
- Docker containerized

## 🚀 Getting Started

### Option 1: Docker Compose (Recommended)

The easiest way to run both backend and frontend:

```bash
cd ChartImpact

# Start all services (frontend, backend, and PostgreSQL)
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Health Check: http://localhost:8080/api/health
# Analytics: http://localhost:3000/analytics
```

The Docker Compose setup includes:
- **Frontend** (Next.js) on port 3000
- **Backend** (Go) on port 8080
- **PostgreSQL** database for result storage and analytics
- Automatic database migrations on startup
- Persistent storage for comparison results

### Option 2: Local Development

**Prerequisites:**
- Go 1.21+ - [Download](https://golang.org/dl/)
- Node.js 18+ and npm 9+ - [Download](https://nodejs.org/)
- Helm 3.x - [Install](https://helm.sh/docs/intro/install/)
- Git

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
# Required for storage:
#   DATABASE_URL=postgres://chartimpact:chartimpact@localhost:5432/chartimpact?sslmode=disable
#   STORAGE_ENABLED=true
#   RESULT_TTL_DAYS=30
go mod download
go run cmd/server/main.go
# Server runs on http://localhost:8080
```

**Database (PostgreSQL):**
```bash
# Start PostgreSQL using Docker
docker run -d \
  --name chartimpact-postgres \
  -e POSTGRES_USER=chartimpact \
  -e POSTGRES_PASSWORD=chartimpact \
  -e POSTGRES_DB=chartimpact \
  -p 5432:5432 \
  -v chartimpact_pgdata:/var/lib/postgresql/data \
  postgres:15-alpine

# Run migrations
cd backend/migrations
# Apply migrations in order (001, 002, 003)
psql -h localhost -U chartimpact -d chartimpact -f 001_create_comparisons_table.up.sql
psql -h localhost -U chartimpact -d chartimpact -f 002_create_analytics_view.up.sql
psql -h localhost -U chartimpact -d chartimpact -f 003_create_cleanup_function.up.sql
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Edit .env to set NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

## 📖 Usage

### How ChartImpact Works Today

ChartImpact provides an **interactive web interface** for manually inspecting Helm chart changes:

1. **Compare Versions** - Enter repository details and select two versions to compare
2. **Review Changes** - Examine differences through the visual diff or Explorer view
3. **Understand Impact** - Identify changes to availability-critical and security-sensitive resources
4. **Share Results** - Results are automatically stored with unique URLs for easy sharing
5. **Access Analytics** - View insights about most compared charts and deployment trends
6. **Make Informed Decisions** - Use the insights to guide your deployment choices

### Result Storage & Replay

ChartImpact automatically stores comparison results for 30 days with the following features:

- **Automatic Deduplication** - Identical comparisons (same repo, chart, versions, values) are stored once
- **Compression** - Results are gzip-compressed to save storage space (~75% reduction)
- **Permalink Access** - Each result gets a unique URL (`/analysis/{uuid}`) for easy sharing
- **Expiration Warnings** - Visual indicators when results are nearing expiration
- **Fresh Re-runs** - Option to execute a new comparison with the same parameters

### Analytics Dashboard

Visit `/analytics` to view:
- Most compared charts across your organization
- Change rate statistics (percentage of comparisons with changes)
- Average modified resources per comparison
- Deployment risk trends over time

### Basic Comparison

1. Enter the **Repository URL** (e.g., `https://github.com/user/repo.git`)
2. Specify the **Chart Path** (e.g., `charts/app`)
3. Enter **Version 1** (tag, branch, or commit SHA)
4. Enter **Version 2** (tag, branch, or commit SHA)
5. (Optional) Provide a values file path or paste values content
6. Click **Compare Versions**

### Example

```
Repository: https://github.com/myorg/helm-charts.git
Chart Path: charts/myapp
Version 1: v1.0.0
Version 2: v1.1.0
Values File: values/prod.yaml
```

### Supported Version Formats

- Git tags: `v1.0.0`, `1.2.3`, `release-2024-01-01`
- Branches: `main`, `develop`, `feature/new-feature`
- Commit SHAs: `abc123def456...`

## 🔌 API Reference

The Go backend exposes the following REST API endpoints:

### POST `/api/compare`

Compare two Helm chart versions.

**Request Body:**

```json
{
  "repository": "https://github.com/argoproj/argo-helm.git",
  "chartPath": "charts/argo-cd",
  "version1": "5.0.0",
  "version2": "5.1.0",
  "valuesFile": "values/production.yaml",  // optional
  "valuesContent": "replicaCount: 3\n",    // optional
  "ignoreLabels": false                     // optional
}
```

**Response:**

```json
{
  "success": true,
  "diff": "... internal diff engine output ...",
  "version1": "5.0.0",
  "version2": "5.1.0"
}
```

### POST `/api/versions`

Fetch available versions (tags and branches) from a repository.

**Request Body:**

```json
{
  "repository": "https://github.com/argoproj/argo-helm.git"
}
```

**Response:**

```json
{
  "success": true,
  "tags": ["5.1.0", "5.0.0", "4.10.0", ...],
  "branches": ["main", "develop", ...]
}
```

### GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "helmOk": true,
  "gitOk": true,
  "dbOk": true
}
```

### GET `/api/analysis/{id}`

Retrieve a stored analysis result by its UUID.

**Response:**

```json
{
  "success": true,
  "comparison": {
    "success": true,
    "diff": "...",
    "structuredDiff": {...}
  },
  "metadata": {
    "storedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-14T10:30:00Z",
    "isExpired": false,
    "isDeduplicated": true,
    "compressionRatio": 0.78
  }
}
```

### GET `/api/analysis`

List stored analysis results with optional filtering.

**Query Parameters:**
- `repository` - Filter by repository URL
- `chartPath` - Filter by chart path
- `since` - ISO 8601 timestamp for start date
- `until` - ISO 8601 timestamp for end date
- `limit` - Maximum results to return (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "comparisons": [
    {
      "compareId": "uuid",
      "repository": "https://github.com/...",
      "chartPath": "charts/app",
      "version1": "1.0.0",
      "version2": "1.1.0",
      "createdAt": "2024-01-15T10:30:00Z",
      "hasChanges": true,
      "modifiedResourcesCount": 5
    }
  ]
}
```

### GET `/api/analytics/charts/popular`

Get analytics about most compared charts.

**Query Parameters:**
- `limit` - Maximum results to return (default: 10)

**Response:**

```json
{
  "success": true,
  "popularCharts": [
    {
      "repository": "https://github.com/...",
      "chartPath": "charts/app",
      "comparisonCount": 42,
      "withChanges": 35,
      "avgModifiedResources": 8.5,
      "lastComparisonAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalComparisons": 150,
  "periodStart": "2023-10-17T00:00:00Z",
  "periodEnd": "2024-01-15T10:30:00Z"
}
```

For detailed API documentation, see [backend/README.md](backend/README.md).

## 🔒 Requirements

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Helm**: 3.x (must be installed and available in PATH)
- **Git**: For cloning repositories

### Installing Helm

**macOS:**
```bash
brew install helm
```

**Linux:**
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

**Windows:**
```powershell
choco install kubernetes-helm
```

## 🚢 Deployment

### Docker Compose (Recommended for Self-Hosting)

The easiest way to deploy both backend and frontend together:

```bash
docker-compose up -d
```

See [docker-compose.yml](docker-compose.yml) for configuration details.

### Cloudflare Pages (Frontend Only)

The frontend can be deployed to Cloudflare Pages. You'll need to deploy the backend separately.

**Build Settings:**
- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `frontend`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend-api.example.com
```

See [frontend/CLOUDFLARE_PAGES.md](frontend/CLOUDFLARE_PAGES.md) for detailed instructions.

### Docker (Manual)

Build and run individual services:

```bash
# Build backend
cd backend
docker build -t chartimpact-backend .
docker run -p 8080:8080 chartimpact-backend

# Build frontend
cd frontend
docker build -t chartimpact-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:8080 chartimpact-frontend
```

## 🔄 Continuous Integration

This project includes GitHub Actions workflows for testing and maintaining code quality:

- **CI Pipeline** (`ci.yml`): Runs backend and frontend tests, linting, and builds on every PR
- **Frontend Tests** (`frontend-tests.yml`): Comprehensive frontend testing including unit, integration, and E2E tests
- **Release Workflow** (`release.yml`): Creates releases and builds Docker images when version tags are pushed
- **CodeQL Analysis** (`codeql.yml`): Security scanning for vulnerabilities

See [`.github/workflows/README.md`](.github/workflows/README.md) for detailed documentation.

> **Note:** These workflows are for maintaining ChartImpact itself. Integration of ChartImpact as an automated check in your own GitHub PRs is a [planned feature](#-roadmap).

## 🛠️ Development

### Project Structure

```
ChartImpact/
├── backend/                   # Go backend API
│   ├── cmd/server/           # Application entry point
│   ├── internal/             # Internal packages
│   │   ├── api/             # HTTP handlers and middleware
│   │   ├── diff/            # Internal diff engine
│   │   ├── service/         # Business logic (Helm operations)
│   │   └── models/          # Data types and schemas
│   ├── Dockerfile           # Backend container
│   └── go.mod               # Go dependencies
├── frontend/                 # Next.js frontend
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes (proxy to backend)
│   │   ├── demo/           # Demo page
│   │   └── page.tsx        # Main comparison page
│   ├── components/          # React components
│   │   ├── explorer/       # Explorer v2 components
│   │   └── __tests__/      # Component tests
│   ├── e2e/                # End-to-end tests (Playwright)
│   ├── Dockerfile          # Frontend container
│   └── package.json        # Frontend dependencies
├── .github/workflows/       # CI/CD automation
├── docker-compose.yml       # Multi-service deployment
└── README.md               # This file
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Environment Variables

**Backend Environment Variables:**

```env
# Storage Configuration (optional, disabled by default)
STORAGE_ENABLED=true                    # Enable result storage and replay
DATABASE_URL=postgres://user:pass@host:port/dbname?sslmode=disable
DB_MAX_CONNECTIONS=25                   # Maximum database connections
RESULT_TTL_DAYS=30                      # Days to retain stored results

# Other Configuration
HELM_TIMEOUT=30000                      # Helm operation timeout (milliseconds)
LOG_LEVEL=info                          # Log level (debug, info, warn, error)
```

**Frontend Environment Variables:**

Create a `.env.local` file for local development:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Storage Configuration

ChartImpact includes optional storage systems for persisting analysis results. Choose between:

#### Option 1: Disk Storage (Lightweight, Ephemeral)

Simple file-based caching with no database required:

**Features:**
- File-based JSON storage
- No in-memory caching
- Startup-only cleanup (no background processes)
- Configurable TTL and disk usage limits
- Atomic writes prevent corruption
- Safe to delete entire directory
- Perfect for lightweight deployments

**To Enable Disk Storage:**

```bash
STORAGE_ENABLED=true
STORAGE_TYPE=disk
DISK_STORAGE_DIR=/data/results
RESULT_TTL_DAYS=30
MAX_DISK_USAGE_MB=1024  # Optional limit (0 = no limit)
```

**When to use:** Development, testing, or simple deployments without analytics requirements.

#### Option 2: PostgreSQL Storage (Full-Featured)

Database storage with compression and analytics:

**Features:**
- 30-day retention with automatic cleanup
- Gzip compression (~75% size reduction)
- Hash-based deduplication (identical comparisons stored once)
- Async storage (doesn't slow down comparisons)
- Analytics for popular charts and trends

**To Enable PostgreSQL Storage:**

1. Set environment variables:
   ```bash
   STORAGE_ENABLED=true
   STORAGE_TYPE=postgres
   DATABASE_URL=postgres://chartimpact:chartimpact@localhost:5432/chartimpact?sslmode=disable
   RESULT_TTL_DAYS=30
   ```

2. Run database migrations (automatically applied with Docker Compose):
   ```bash
   cd backend/migrations
   psql -h localhost -U chartimpact -d chartimpact -f 001_create_comparisons_table.up.sql
   psql -h localhost -U chartimpact -d chartimpact -f 002_create_analytics_view.up.sql
   psql -h localhost -U chartimpact -d chartimpact -f 003_create_cleanup_function.up.sql
   ```

3. (Optional) Schedule cleanup job:
   ```sql
   -- Manual cleanup
   SELECT delete_expired_comparisons();
   
   -- Or use pg_cron for automatic cleanup
   SELECT cron.schedule('cleanup-expired', '0 2 * * *', 
     'SELECT delete_expired_comparisons()');
   ```

**When to use:** Production deployments requiring analytics, long-term storage, and reporting.

---

**Storage is optional** - ChartImpact works perfectly without it, but you'll miss out on result replay features.

For more details, see [STORAGE_SPEC.md](STORAGE_SPEC.md).

## 🐛 Troubleshooting

### "Helm not found" Error

Ensure Helm is installed and available in your PATH:

```bash
which helm
helm version
```

### "Failed to clone repository" Error

- Verify the repository URL is correct and accessible
- Check network connectivity
- Ensure the repository is public or credentials are configured

### "Chart path not found" Error

- Verify the chart path exists in the repository
- Check that the specified version contains the chart
- Ensure the path is relative to the repository root

### Slow Performance

- Large repositories may take time to clone
- Consider using shallow clones for faster performance
- Check system resources (CPU, memory, disk)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Helm](https://helm.sh/) - The package manager for Kubernetes
- [Next.js](https://nextjs.org/) - The React framework
- [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) - Syntax highlighting

## 📞 Support

- 🐛 [Report a bug](https://github.com/dcotelo/ChartImpact/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/dcotelo/ChartImpact/issues/new?template=feature_request.md)
- 💬 [Start a discussion](https://github.com/dcotelo/ChartImpact/discussions)

---

Made with ❤️ for the Kubernetes and Helm community

