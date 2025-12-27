# Getting Started with ChartImpact

This guide will help you quickly get started with the ChartImpact web application.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Docker and Docker Compose** (recommended for quick start)

**OR for local development:**

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)
- **Go 1.21+** installed ([Download](https://golang.org/dl/))
- **Helm 3.x** installed ([Installation Guide](https://helm.sh/docs/intro/install/))
- **Git** installed

### Quick Start with Docker Compose (Recommended)

1. **Clone the repository**

```bash
git clone https://github.com/dcotelo/ChartImpact.git
cd ChartImpact
```

2. **Start the application**

```bash
docker-compose up
```

3. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

### Local Development Setup

### Local Development Setup

If you want to run the services separately for development:

**Backend:**
```bash
cd backend
cp .env.example .env
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

## 📝 First Comparison

### Example: Compare Two Chart Versions

1. **Repository URL**: `https://github.com/your-org/helm-charts.git`
2. **Chart Path**: `charts/myapp`
3. **Version 1**: `v1.0.0` (or a git tag/branch/commit)
4. **Version 2**: `v1.1.0` (or a git tag/branch/commit)
5. **Values File** (optional): `values/prod.yaml`

Click **Compare Versions** and wait for the results!

### Understanding the Output

The application provides two views for comparing charts:

- **Classic View**: Traditional text-based diff with syntax highlighting
- **Explorer View**: Interactive structured view with:
  - Resource-by-resource navigation
  - Field-level change details
  - Filtering and search capabilities
  - Statistics dashboard showing change impact

## 🔧 Common Use Cases

### Compare Tags

```
Version 1: v1.0.0
Version 2: v1.1.0
```

### Compare Branches

```
Version 1: main
Version 2: develop
```

### Compare Commits

```
Version 1: abc123def456...
Version 2: xyz789ghi012...
```

### With Custom Values

You can either:
- Provide a **values file path** (relative to repo root)
- Or **paste values content** directly in the textarea

## 🐛 Troubleshooting

### "Helm command not found"

Install Helm:

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

### "Failed to clone repository"

- Check your internet connection
- Verify the repository URL is correct
- Ensure the repository is public or you have access

### "Chart path not found"

- Verify the chart path exists in the repository
- Check that the path is relative to the repository root
- Ensure the specified version contains the chart

### Slow Performance

- Large repositories may take time to clone
- First-time comparisons may be slower
- Check your system resources

## 🚢 Running in Production

### Using Docker Compose

```bash
docker-compose up -d
```

This starts both backend and frontend services in production mode.

### Using Individual Docker Containers

**Backend:**
```bash
cd backend
docker build -t chartimpact-backend .
docker run -p 8080:8080 chartimpact-backend
```

**Frontend:**
```bash
cd frontend
docker build -t chartimpact-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:8080 chartimpact-frontend
```

### Cloudflare Pages (Frontend)

See [frontend/CLOUDFLARE_PAGES.md](frontend/CLOUDFLARE_PAGES.md) for deploying the frontend to Cloudflare Pages. You'll need to deploy the backend separately.

## 📚 Next Steps

- Read the [full documentation](README.md)
- Check out [API reference](README.md#api-reference)
- Explore [deployment options](README.md#deployment)

## 💡 Tips

- Use **shallow clones** for faster performance (handled automatically)
- **Values files** are optional but recommended for accurate comparisons
- The app supports both **public and private** repositories (if properly authenticated)
- **Commit SHAs** work great for comparing specific changes

---

Happy comparing! 🎉

