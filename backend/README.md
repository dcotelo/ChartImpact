![ChartInspect](../ChartInspect.png)

# ChartImpact Backend

Go-based REST API for comparing Helm chart versions using the Helm Go SDK.

## Features

- 🚀 **High Performance** - Built with Go for speed and efficiency
- 📦 **Helm SDK Integration** - Uses official Helm Go SDK for chart operations
- 🔄 **Git Integration** - Clones and compares charts from Git repositories
- 🔍 **Internal Diff Engine** - Fast, deterministic, Kubernetes-aware diff engine (no external dependencies)
- 🔧 **Optional dyff Support** - Can use dyff for backwards compatibility if needed
- 🛡️ **Robust Error Handling** - Comprehensive error messages and logging
- 📊 **Health Checks** - Built-in health check endpoint
- ⚙️ **Configurable** - Environment-based configuration

## Architecture

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── api/
│   │   ├── handlers/            # HTTP request handlers
│   │   │   ├── compare.go       # Chart comparison endpoint
│   │   │   ├── versions.go      # Version listing endpoint
│   │   │   └── health.go        # Health check endpoint
│   │   └── middleware/          # HTTP middleware
│   │       ├── cors.go          # CORS handling
│   │       ├── logging.go       # Request logging
│   │       └── recovery.go      # Panic recovery
│   ├── diff/
│   │   ├── engine.go            # Internal diff engine
│   │   ├── parser.go            # YAML manifest parser
│   │   ├── types.go             # Diff data structures
│   │   └── diff_test.go         # Comprehensive tests
│   ├── service/
│   │   └── helm.go              # Helm chart operations using SDK
│   └── models/
│       └── types.go             # Request/response types
├── .env                         # Environment configuration
├── .env.example                 # Environment template
├── go.mod                       # Go module definition
└── Dockerfile                   # Docker build configuration
```

## Prerequisites

- **Go 1.21+** - [Download](https://golang.org/dl/)
- **Helm 3.x** - [Installation Guide](https://helm.sh/docs/intro/install/)
- **Git** - For cloning repositories
- **dyff** (optional) - Only needed if INTERNAL_DIFF_ENABLED is set to false
  ```bash
  # macOS
  brew install homeport/tap/dyff
  
  # Linux
  curl -fsSL https://github.com/homeport/dyff/releases/latest/download/dyff_linux_amd64.tar.gz | tar -xz
  sudo mv dyff /usr/local/bin/
  ```

> **Note**: The backend now includes an internal diff engine that is faster and more deterministic than dyff. 
> dyff is only required if you explicitly disable the internal diff engine (not recommended).

## Quick Start

### Option 1: Run Locally

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   go mod download
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run the server:**
   ```bash
   go run cmd/server/main.go
   ```

   The server will start on `http://localhost:8080`

### Option 2: Use Docker

```bash
# Build the image
docker build -t chartimpact-backend .

# Run the container
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e LOG_LEVEL=info \
  -v /tmp:/tmp \
  chartimpact-backend
```

### Option 3: Use Docker Compose

From the project root:
```bash
docker-compose up backend
```

## Internal Diff Engine

The backend includes a high-performance internal diff engine designed specifically for Kubernetes manifests:

### Key Features
- ⚡ **Fast**: No external process overhead, pure Go implementation
- 🎯 **Deterministic**: Same inputs always produce identical output
- 🧠 **Kubernetes-Aware**: Understands resource structure (apiVersion, kind, metadata)
- 📊 **Structured Output**: Field-level diffs optimized for frontend consumption
- 🔧 **Configurable**: Can ignore labels, annotations, or specific fields

### How It Works
1. **Normalization**: Parses YAML manifests into canonical structures
2. **Resource Matching**: Identifies resources by apiVersion, kind, name, and namespace
3. **Field-Level Diffing**: Compares resources field-by-field with deep equality
4. **Structured Output**: Generates both human-readable and structured JSON diffs

### Comparison with dyff

| Feature | Internal Engine | dyff |
|---------|----------------|------|
| Performance | ⚡ Very Fast | Moderate |
| External Dependency | ❌ None | ✅ Required |
| Deterministic Output | ✅ Yes | ✅ Yes |
| Kubernetes-Aware | ✅ Yes | ✅ Yes |
| Field Filtering | ✅ Built-in | Limited |
| Output Format | Structured + Raw | Raw text |

The internal diff engine is **enabled by default** and recommended for production use. dyff support is maintained for backwards compatibility.

## API Endpoints

### POST /api/compare

Compare two Helm chart versions.

**Request:**
```json
{
  "repository": "https://github.com/argoproj/argo-helm.git",
  "chartPath": "charts/argo-cd",
  "version1": "5.0.0",
  "version2": "5.1.0",
  "valuesFile": "values/production.yaml",
  "valuesContent": "replicaCount: 3\n",
  "ignoreLabels": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "diff": "... diff output ...",
  "version1": "5.0.0",
  "version2": "5.1.0"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to clone repository: ..."
}
```

### POST /api/versions

Fetch available versions (tags/branches) from a repository.

**Request:**
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

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "helmOk": true,
  "gitOk": true,
  "dyffOk": false
}
```

**Note:** `dyffOk` can be `false` when using the internal diff engine (INTERNAL_DIFF_ENABLED=true). 
The status will still be "ok" as dyff is not required.

## Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and customize:

### Server Settings
- `PORT` - Server port (default: 8080)
- `HOST` - Bind address (default: 0.0.0.0)

### CORS Settings
- `CORS_ALLOWED_ORIGINS` - Comma-separated allowed origins
- `CORS_ALLOWED_METHODS` - Allowed HTTP methods
- `CORS_ALLOWED_HEADERS` - Allowed request headers

### Git Configuration
- `GIT_TERMINAL` - Prevent interactive prompts (default: dumb)
- `GIT_ASKPASS` - Disable password prompts (default: echo)
- `GIT_SSH_COMMAND` - SSH options

### Paths
- `TEMP_DIR` - Temporary directory for chart operations (default: /tmp/chartimpact)

### Timeouts (seconds)
- `COMPARE_TIMEOUT` - Maximum time for comparison (default: 120)
- `VERSIONS_TIMEOUT` - Maximum time for version fetching (default: 60)
- `GIT_CLONE_TIMEOUT` - Maximum time for git clone (default: 120)
- `HELM_TIMEOUT` - Maximum time for helm operations (default: 60)

### Logging
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)
- `LOG_FORMAT` - Log format: json, text (default: json)

### Features
- `INTERNAL_DIFF_ENABLED` - Use internal diff engine (default: true, recommended)
  - When enabled: Fast, deterministic, Kubernetes-aware diffing without external dependencies
  - When disabled: Falls back to dyff or simple diff
- `DYFF_ENABLED` - Use dyff for diffs when internal diff is disabled (default: true)

## Development

### Run with hot reload

```bash
# Install air for hot reload
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

### Run tests

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run with verbose output
go test -v ./...
```

### Build binary

```bash
# Build for current platform
go build -o server cmd/server/main.go

# Build for Linux
GOOS=linux GOARCH=amd64 go build -o server-linux cmd/server/main.go

# Build for production (optimized)
CGO_ENABLED=0 go build -ldflags="-s -w" -o server cmd/server/main.go
```

## Logging

The backend uses structured logging with logrus. Logs include:

- HTTP request/response details
- Operation timing
- Error stack traces
- Health check results

Example log entry (JSON format):
```json
{
  "level": "info",
  "method": "POST",
  "path": "/api/compare",
  "status": 200,
  "duration": 15234,
  "remote": "172.17.0.1:54321",
  "msg": "HTTP request",
  "time": "2025-12-25T10:30:45Z"
}
```

## Error Handling

The API returns consistent error responses:

- **400 Bad Request** - Invalid input or validation errors
- **500 Internal Server Error** - Server-side failures

All errors include:
- `success: false`
- `error: "Detailed error message"`

Errors are logged with full context for debugging.

## Security Considerations

1. **Non-root user** - Docker container runs as non-root user (uid 1001)
2. **No credential storage** - Git credentials must be in repository URLs
3. **Timeout protection** - All operations have configurable timeouts
4. **CORS protection** - Configurable allowed origins
5. **Input validation** - All requests are validated before processing

## Performance

- **Concurrent requests** - Server handles multiple requests simultaneously
- **Temporary cleanup** - Automatic cleanup of temporary directories
- **Connection pooling** - Efficient resource usage
- **Timeout management** - Prevents hung operations

Typical operation times:
- Version fetch: 2-5 seconds
- Chart comparison: 10-30 seconds (depends on chart size and dependencies)

## Troubleshooting

### Helm not found
```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Git clone fails
- Check repository URL format
- Verify network connectivity
- For private repos, use SSH keys or access tokens in URL

### Dyff not available
```bash
# Dyff is optional - set DYFF_ENABLED=false to use simple diff
export DYFF_ENABLED=false
```

### Permission denied on /tmp
```bash
# Ensure write permissions
sudo chmod 1777 /tmp
# Or change TEMP_DIR to a writable location
export TEMP_DIR=/home/user/chartimpact-temp
```

## License

MIT License - see LICENSE file for details
