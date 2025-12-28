# Backend Architecture

## Overview

ChartImpact's backend is a Go-based HTTP API service that performs semantic analysis of Helm chart changes. It transforms raw template differences into structured, mission-aligned signals about availability and security impacts.

## Mission-Driven Design

The backend's primary mission is to:
1. **Surface availability risks** - Changes affecting deployment rollout, service exposure, and workload health
2. **Identify security impacts** - Changes affecting RBAC, security contexts, network policies, and secret handling
3. **Enable confident decisions** - Provide deterministic, repeatable analysis suitable for both interactive and automated workflows

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP API Layer                          │
│  (handlers, middleware, routing)                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Service Layer                              │
│  • HelmService: Chart operations & comparison orchestration │
│  • FetchVersions: Repository version discovery              │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Analysis Engine                            │
│  • Diff Engine: Semantic comparison & change detection      │
│  • Signal Engine: Impact analysis & classification          │
│  • Parser: YAML manifest parsing & normalization            │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│               External Dependencies                         │
│  • Helm SDK: Template rendering & chart operations          │
│  • Git: Repository cloning & version checkout               │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. HTTP API Layer (`internal/api`)

**Purpose**: Handle HTTP requests, validate inputs, manage responses

**Components**:
- `handlers/`: Request handlers for each endpoint
  - `compare.go`: POST /api/compare - Chart version comparison
  - `versions.go`: POST /api/versions - Repository version listing
  - `health.go`: GET /api/health - Service health check
- `middleware/`: Cross-cutting concerns
  - `cors.go`: CORS policy enforcement
  - `logging.go`: Request/response logging
  - `recovery.go`: Panic recovery and error handling

**Key Characteristics**:
- Stateless request handling
- Comprehensive input validation
- Structured error responses
- Request-scoped contexts with timeouts

### 2. Service Layer (`internal/service`)

**Purpose**: Orchestrate chart operations and manage business logic

**Components**:
- `HelmService`: Primary service handling chart comparison workflow
  - Repository cloning
  - Chart extraction and validation
  - Dependency building
  - Template rendering (via Helm SDK)
  - Diff computation (via Diff Engine)
  - Response construction

**Key Characteristics**:
- Ephemeral workspace management
- Timeout-aware operations
- Comprehensive cleanup on success/failure
- Detailed structured logging

**Comparison Workflow**:
```
1. Create unique work directory
2. Clone Git repository
3. Extract version 1 → build deps → render templates
4. Extract version 2 → build deps → render templates
5. Compare rendered manifests (Diff Engine)
6. Convert to API response format
7. Cleanup work directory
```

### 3. Analysis Engine (`internal/diff`)

**Purpose**: Transform raw YAML differences into structured, semantic changes

**Components**:
- `Engine`: Core diff computation
  - Manifest parsing
  - Resource-level comparison
  - Field-level change detection
  - Hash computation for change tracking
- `Parser`: YAML parsing and normalization
  - Multi-document YAML splitting
  - Resource identification
  - Field normalization
- `Semantic Classifier`: Change interpretation
  - Semantic type detection (e.g., "container.image", "security.context")
  - Change category assignment (workload, networking, security)
  - Importance scoring (high, medium, low)
  - Flag assignment (runtime-impact, breaking-change, etc.)

**Key Characteristics**:
- Deterministic output (same inputs → same results)
- Versioned diff specification (v1.0.0)
- Comprehensive metadata for traceability
- Both structured and raw output formats

**Change Detection Algorithm**:
```
For each resource in both versions:
  1. Identify by (APIVersion, Kind, Name, Namespace)
  2. Determine change type: added | removed | modified
  3. If modified:
     a. Compare fields recursively
     b. Detect adds, removes, replaces
     c. Classify semantic type
     d. Assign importance
     e. Add contextual flags
  4. Generate resource summary
```

### 4. Models (`internal/models`)

**Purpose**: Define data contracts for API and internal communication

**Key Types**:
- `CompareRequest/Response`: API endpoint contracts
- `StructuredDiffResult`: Diff engine output format
- `ResourceDiff`: Per-resource change representation
- `Change`: Field-level change with semantic metadata
- `DiffMetadata`: Traceability and versioning information

## Data Flow

### Comparison Request Flow

```
Client Request
    ↓
[Handlers] Validate & parse request
    ↓
[HelmService] Clone repo & extract versions
    ↓
[Helm SDK] Render templates for both versions
    ↓
[Diff Engine] Parse manifests & compute differences
    ↓
[Semantic Classifier] Enrich changes with meaning
    ↓
[HelmService] Convert to API response format
    ↓
[Handlers] Return JSON response to client
```

### Change Classification Flow

```
Raw Field Difference
    ↓
Path Analysis → Semantic Type (e.g., "container.image")
    ↓
Category Classification → "workload", "security", "networking"
    ↓
Importance Determination → "high", "medium", "low"
    ↓
Flag Assignment → ["runtime-impact", "rollout-trigger"]
    ↓
Enriched Change Object
```

## Current Capabilities

### Supported Analysis

✅ **Resource-level changes**:
- Added resources
- Removed resources  
- Modified resources with field-level detail

✅ **Field-level semantic classification**:
- Container images (`container.image`)
- Environment variables (`container.env`)
- Replica counts (`workload.replicas`)
- Resource limits/requests (`resources.cpu`, `resources.memory`)
- Service ports (`service.port`)
- Security contexts (`security.context`)
- Service accounts (`security.serviceAccount`)
- Volume mounts (`storage.volume`)

✅ **Change categorization**:
- Workload changes
- Networking changes
- Security changes
- Resource changes
- Configuration changes
- Storage changes
- Metadata changes

✅ **Importance levels**:
- High: Image changes, replica changes, security contexts
- Medium: Resource limits, environment variables, ports
- Low: Labels, annotations

✅ **Contextual flags**:
- `runtime-impact`: Affects running workloads
- `rollout-trigger`: Triggers pod restarts
- `scaling-change`: Changes replica count
- `security-impact`: Security-sensitive change
- `breaking-change`: Potentially disruptive
- `networking-change`: Networking configuration

### Current Limitations

❌ **Not yet supported**:
- Cross-resource pattern detection (e.g., "all deployments lost probes")
- Availability-specific signals (readiness/liveness probe changes)
- Security-specific signals (privilege escalation, host access)
- Service exposure risk detection (ClusterIP → LoadBalancer)
- Breaking change risk assessment
- Change impact summaries optimized for webhooks

## Triggering Mechanisms

### Current: Manual/Interactive Only

**Entry Points**:
1. HTTP POST to `/api/compare` endpoint
2. Manual form submission via frontend UI
3. API calls from external tools

**Characteristics**:
- Synchronous request/response
- User-initiated
- UI context required for interpretation
- No persistence of results
- No event-driven triggers

**Input Requirements**:
- Git repository URL
- Chart path within repository
- Two version references (tags/branches/commits)
- Optional values file or content
- Optional diff configuration (ignore labels, etc.)

### Webhook Readiness Assessment

**Ready for webhooks**:
✅ Stateless processing
✅ Deterministic outputs
✅ Timeout-aware operations
✅ Structured error handling
✅ Idempotent (same inputs → same results)

**Not yet webhook-ready**:
❌ No event ingestion endpoint
❌ No GitHub event payload parsing
❌ No PR/push/release event mapping
❌ No webhook signature verification
❌ No async processing queue
❌ No result persistence
❌ No GitHub API integration (for commenting)
❌ No duplicate event detection

## Performance Characteristics

**Typical Operation Times** (varies by chart size):
- Repository clone: 2-10 seconds
- Chart rendering: 1-5 seconds per version
- Diff computation: <1 second
- Total comparison: 5-25 seconds

**Resource Requirements**:
- CPU: Moderate during rendering, low during diff
- Memory: ~100-500MB per comparison
- Disk: Ephemeral workspace ~50-200MB per comparison
- Network: Repository clone bandwidth

**Concurrency**:
- Gorilla mux handles concurrent HTTP requests
- Each comparison is independent
- Workspace isolation prevents conflicts
- No shared state between requests

## Extensibility Points

### 1. Signal Enrichment

Current semantic classification is basic. Extension points:

**Location**: `internal/diff/semantic.go`
- `classifySemanticType()`: Add new semantic types
- `classifyChangeCategory()`: Add new categories
- `determineImportance()`: Refine importance logic
- `determineFlags()`: Add new contextual flags

**Example**: Add readiness probe detection:
```go
case strings.Contains(path, ".readinessProbe"):
    return "availability.readinessProbe"
```

### 2. Resource-Specific Analyzers

**Future Addition**: `internal/analysis/` package
- Deployment analyzer: Rollout strategy, probe changes
- Service analyzer: Exposure changes, port mapping
- RBAC analyzer: Permission escalation
- NetworkPolicy analyzer: Traffic rule changes

### 3. Multi-Resource Pattern Detection

**Future Addition**: Cross-resource correlation
- Detect patterns like "all workloads losing probes"
- Identify coordinated security changes
- Summarize aggregate impacts

### 4. Event-Driven Processing

**Future Addition**: `internal/events/` package
- GitHub webhook receiver
- Event payload parser
- Event-to-comparison mapper
- Async processing queue

## Testing Strategy

### Current Test Coverage

**Unit Tests**:
- Diff engine: Change detection, classification
- Parser: YAML parsing, resource extraction
- Semantic analysis: Type/category/importance assignment
- Middleware: CORS, logging, recovery
- Utilities: Environment variable parsing

**Integration Tests**:
- Full comparison workflow
- Real Helm chart rendering
- Multi-resource diffs

**Test Characteristics**:
- Deterministic (no flaky tests)
- Fast (total runtime <10 seconds)
- Isolated (no external dependencies in unit tests)

### Future Testing Needs

**For Webhook Support**:
- Event ingestion tests
- Idempotency tests (same event twice)
- Timeout handling
- Error recovery
- Concurrent event processing

**For Signal Quality**:
- Golden test cases for availability risks
- Golden test cases for security impacts
- Real-world chart diff scenarios
- Regression tests for signal consistency

## Security Considerations

**Current Measures**:
- Input validation on all API endpoints
- Repository URL format validation
- Timeout enforcement on long operations
- Workspace isolation with unique directories
- Cleanup of temporary files
- CORS policy enforcement
- Panic recovery middleware

**For Webhook Integration**:
- Webhook signature verification (HMAC)
- Event payload validation
- Rate limiting
- Duplicate event detection
- Scoped GitHub tokens
- Audit logging of all events

## Scalability Considerations

**Current Design**:
- Stateless (horizontal scaling possible)
- No database required
- Ephemeral workspace per request
- Independent comparison operations

**For Production Scale**:
- Add request queue for rate limiting
- Consider caching for repeated comparisons
- Implement workspace recycling
- Add metrics/observability (Prometheus)
- Consider async processing for webhooks

## Configuration

**Environment Variables**:
- `TEMP_DIR`: Working directory for comparisons (default: `/tmp/chartimpact`)
- `COMPARE_TIMEOUT`: Timeout for full comparison (default: 120s)
- `GIT_CLONE_TIMEOUT`: Timeout for repository clone (default: 120s)
- `HELM_TIMEOUT`: Timeout for Helm operations (default: 60s)
- `INTERNAL_DIFF_ENABLED`: Use internal diff engine (default: true)
- `DYFF_ENABLED`: Use dyff fallback (default: false, deprecated)

## Deployment

**Current Deployment**:
- Docker container
- Fly.io (production)
- Docker Compose (local development)
- Health check endpoint for orchestration

**Requirements**:
- Helm 3.x installed in container
- Git installed in container
- Network access for repository cloning
- Write access to TEMP_DIR

## Future Roadmap

### Near-Term (Mission Alignment)

1. **Enhanced Availability Signals**
   - Probe changes (readiness, liveness, startup)
   - Rollout strategy changes
   - PodDisruptionBudget changes
   - Resource limit increases/decreases

2. **Enhanced Security Signals**
   - Security context changes (privilege, capabilities)
   - Service account changes
   - RBAC rule changes
   - Secret reference changes
   - Host path volume additions

3. **Signal Output Schema**
   - Versioned signal taxonomy
   - Structured signal objects
   - Human-readable explanations
   - References to raw changes

### Medium-Term (Webhook Support)

4. **Event Ingestion**
   - GitHub webhook receiver endpoint
   - Event signature verification
   - Event payload parsing (PR, push, release)

5. **Event Processing**
   - Map events to comparison inputs
   - Async processing queue
   - Result persistence
   - Duplicate event detection

6. **GitHub Integration**
   - Post PR comments with analysis
   - Update PR check status
   - Respect rate limits

### Long-Term (Advanced Features)

7. **Pattern Detection**
   - Cross-resource analysis
   - Breaking change detection
   - Risk scoring

8. **Configurable Policies**
   - Team-defined risk thresholds
   - Custom signal rules
   - Suppression filters

## Conclusion

The current backend is a solid foundation for mission-aligned, event-driven impact analysis:

**Strengths**:
- Clean, layered architecture
- Deterministic, repeatable analysis
- Semantic understanding of changes
- Stateless, horizontally scalable design
- Comprehensive test coverage

**Ready for Enhancement**:
- Signal taxonomy and schema
- Availability and security focus
- Webhook event handling
- GitHub integration
- Advanced pattern detection

The architecture supports incremental enhancement without major refactoring.
