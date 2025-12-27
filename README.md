![ChartInspect](ChartInspect.png)

# Chart Impact

A modern web application for comparing differences between two Helm chart versions. Built with a **Go backend** using the Helm SDK and a **Next.js frontend** for a fast, scalable, and maintainable architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

- 🔍 **Version Comparison** - Compare any two versions (tags, branches, or commits) of a Helm chart
- 📊 **Visual Diff Display** - Beautiful syntax-highlighted diff output powered by internal diff engine
- ⚡ **High Performance** - Fast internal diff engine optimized for Kubernetes manifests
- 🎨 **Modern UI** - Clean, responsive interface built with React and Next.js
- 🚀 **Fast & Efficient** - Go backend with Helm Go SDK for optimal performance
- 🔧 **Flexible** - Support for custom values files or inline values content
- 📦 **No External Dependencies** - Internal diff engine eliminates need for dyff
- 🛡️ **Production Ready** - Comprehensive error handling, logging, and health checks

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

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
- **Dual build modes:**
  - Static export for Cloudflare Pages
  - Standalone for Docker deployment

### Deployment Architecture

The frontend can be deployed in two modes:

**Static Export (Cloudflare Pages):**
```
┌─────────────────────┐         ┌──────────────────┐
│  Cloudflare Pages   │  HTTPS  │  Backend API     │
│  (Static Frontend)  ├────────►│  (Go Service)    │
│  - HTML/CSS/JS      │         │  - Cloud Run     │
│  - No server        │         │  - AWS Lambda    │
└─────────────────────┘         │  - etc.          │
                                └──────────────────┘
```

**Standalone (Docker):**
```
┌─────────────────┐         ┌──────────────────┐
│  Next.js Server │  HTTP   │  Go Backend      │
│  (Node.js)      ├────────►│  (Container)     │
│  Port 3000      │         │  Port 8080       │
└─────────────────┘         └──────────────────┘
```

## 🚀 Getting Started

### Option 1: Docker Compose (Recommended)

The easiest way to run both backend and frontend:

```bash
# Clone the repository
git clone https://github.com/your-username/chartimpact.git
cd chartimpact

# Start both services
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Health Check: http://localhost:8080/api/health
```

### Option 2: Local Development

**Prerequisites:**
- Go 1.21+ - [Download](https://golang.org/dl/)
- Node.js 18+ and npm 9+ - [Download](https://nodejs.org/)
- Helm 3.x - [Install](https://helm.sh/docs/intro/install/)
- Git
- (Optional) dyff - `brew install homeport/tap/dyff`

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
go mod download
go run cmd/server/main.go
# Server runs on http://localhost:8080
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
  "diff": "... dyff or plain diff output ...",
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
  "dyffOk": true
}
```

For detailed API documentation, see [backend/README.md](backend/README.md).
  "version2": "v1.1.0",
  "valuesFile": "values/prod.yaml",
  "valuesContent": "replicaCount: 3\nimage:\n  tag: latest"
}
```

**Response:**

```json
{
  "success": true,
  "diff": "--- version1\n+++ version2\n...",
  "version1": "v1.0.0",
  "version2": "v1.1.0"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message here"
}
```

## 🔒 Requirements

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Helm**: 3.x (must be installed and available in PATH)
- **Git**: For cloning repositories

### Optional Tools

- **dyff**: Only needed if you disable the internal diff engine (not recommended)

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

ChartImpact supports multiple deployment options:

### Option 1: Cloudflare Pages (Recommended for Frontend)

Deploy the frontend as a static site to Cloudflare Pages:

**Prerequisites:**
- Deploy the Go backend to a cloud service (e.g., Cloud Run, AWS Lambda, etc.)
- Cloudflare account with Pages enabled

**Quick Start:**
```bash
cd frontend
npm run build:cloudflare
# Output in frontend/out/ ready for Cloudflare Pages
```

See [CLOUDFLARE_PAGES_DEPLOYMENT.md](CLOUDFLARE_PAGES_DEPLOYMENT.md) for complete setup guide.

### Option 2: Docker Compose (Recommended for Self-Hosted)

Deploy both frontend and backend together:

```bash
# Start both services
docker-compose up

# Or in detached mode
docker-compose up -d
```

See [docker-compose.yml](docker-compose.yml) for configuration options.

### Option 3: Vercel (Legacy)

Frontend-only deployment to Vercel:

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables if needed
4. Deploy!

**Note:** Consider using Cloudflare Pages for better static site performance.

### Option 4: Individual Docker Images

For separate deployment of frontend and backend:

```bash
# Build frontend image
docker build -t chartimpact-frontend frontend/

# Build backend image
docker build -t chartimpact-backend backend/

# Run containers
docker run -p 3000:3000 chartimpact-frontend
docker run -p 8080:8080 chartimpact-backend
```

### Option 5: Self-Hosted

For production deployment on your own infrastructure:

**Frontend:**
```bash
cd frontend
npm run build  # For server-side rendering
# or
npm run build:cloudflare  # For static export

# Serve with Node.js (if using standalone build)
npm start

# Or serve with any static file server (if using static export)
npx serve out
```

**Backend:**
```bash
cd backend
go build -o chartimpact-server ./cmd/server
./chartimpact-server
```

## 🔄 CI/CD

This project includes GitHub Actions workflows for automated testing, building, and deployment:

- **CI Pipeline** (`ci.yml`): Runs tests and builds on every push/PR
- **Cloudflare Pages** (`cloudflare-pages.yml`): Deploys frontend to Cloudflare Pages
- **Release Workflow** (`release.yml`): Creates releases when version tags are pushed
- **Frontend Tests** (`frontend-tests.yml`): Comprehensive frontend testing
- **Docker Publishing** (`docker-publish.yml`): Builds and publishes Docker images (optional)

See [`.github/workflows/README.md`](.github/workflows/README.md) for detailed setup instructions.

### Status Badge

Add this to your README to show CI status:

```markdown
![CI](https://github.com/your-username/helm-chart-diff-viewer/workflows/CI/badge.svg)
```

## 🛠️ Development

### Project Structure

```
helm-chart-diff-viewer/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── compare/       # Comparison endpoint
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── CompareForm.tsx    # Input form
│   └── DiffDisplay.tsx    # Diff output display
├── lib/                   # Shared utilities
│   └── types.ts           # TypeScript types
├── services/              # Business logic
│   └── helm-service.ts    # Helm comparison service
└── public/                # Static assets
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

Create a `.env.local` file for local development:

```env
# Optional: Custom timeout for operations (in milliseconds)
HELM_TIMEOUT=30000
```

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
- [dyff](https://github.com/homeport/dyff) - YAML diff tool
- [Next.js](https://nextjs.org/) - The React framework
- [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) - Syntax highlighting

## 📞 Support

- 🐛 [Report a bug](https://github.com/your-username/helm-chart-diff-viewer/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/your-username/helm-chart-diff-viewer/issues/new?template=feature_request.md)
- 💬 [Start a discussion](https://github.com/your-username/helm-chart-diff-viewer/discussions)

---

Made with ❤️ for the Kubernetes and Helm community

