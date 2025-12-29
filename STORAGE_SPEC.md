# ChartImpact — Result Storage & Replay Specification (v1)

## 1. Purpose

This specification defines how analysis results are persisted so that:
- A canonical result link always shows the exact same output
- No Helm rendering, diffing, or rule evaluation is required on replay
- Stored results are immutable
- Future UI or rule changes do not alter past results

This spec does not define how diffs are computed — only how results are stored and retrieved.

---

## 2. Design principles

1. **Immutability**
   - Stored results must never change after creation
   - No UPDATEs; only INSERT (and optional DELETE for retention)

2. **Exact replay**
   - Stored data must be sufficient to fully render:
     - summary
     - semantic changes
     - structural diff (old/new values)
   - Replay must not depend on recomputation

3. **Separation of concerns**
   - Computation produces artifacts
   - Storage freezes artifacts
   - UI renders artifacts

4. **Rule evolution safe**
   - Semantic interpretation is versioned
   - Past results are not reinterpreted

5. **Deduplication**
   - Identical comparisons (same repo/chart/versions/values) stored once
   - Deterministic hash for content-based lookup

6. **Compression**
   - Large structured diffs compressed with gzip
   - Typical 75% size reduction
   - Transparent decompression on retrieval

7. **Time-based retention**
   - Results expire after 30 days (configurable)
   - Automatic cleanup via database jobs

---

## 3. Storage lifecycle

### 3.1 Creation

1. Backend receives comparison request
2. Compute content hash from request parameters
3. Check for existing result by hash (within TTL)
4. If exists: return cached result with `compare_id`
5. If not exists:
   - Execute comparison
   - Compress structured diff with gzip
   - Persist comparison + compressed diff + metadata
   - Set `expires_at` = NOW() + retention period
6. Return comparison with `compare_id`

### 3.2 Replay

1. Client requests `/analysis/{compare_id}`
2. Backend loads stored artifacts by UUID
3. Decompress structured diff automatically
4. Return stored data with metadata (created, expires)
5. UI renders directly from stored data
6. No Helm / dyff / rules are executed

### 3.3 Cleanup

1. Periodic job runs (daily via pg_cron)
2. Delete comparisons where `expires_at < NOW()`
3. Cascade delete related records
4. Log cleanup statistics

---

## 4. PostgreSQL schema (authoritative)

### 4.1 comparisons

Defines what was compared and stores compressed results.

```sql
CREATE TABLE comparisons (
  id BIGSERIAL PRIMARY KEY,
  compare_id UUID NOT NULL UNIQUE,
  content_hash VARCHAR(64) NOT NULL,
  
  -- Comparison identity
  repository VARCHAR(512) NOT NULL,
  chart_path VARCHAR(255) NOT NULL,
  version1 VARCHAR(100) NOT NULL,
  version2 VARCHAR(100) NOT NULL,
  values_file VARCHAR(512),
  values_sha256 VARCHAR(64),
  
  -- Queryable metadata (lightweight JSONB)
  metadata JSONB NOT NULL,
  stats JSONB NOT NULL,
  
  -- Compressed storage (BYTEA with gzip)
  full_diff_compressed BYTEA NOT NULL,
  compression_format VARCHAR(20) NOT NULL DEFAULT 'gzip',
  uncompressed_size INTEGER NOT NULL,
  
  -- Metadata
  engine_version VARCHAR(20) NOT NULL,
  helm_version VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT uq_content_hash UNIQUE (content_hash)
);

CREATE INDEX idx_comparisons_compare_id ON comparisons(compare_id);
CREATE INDEX idx_comparisons_created_at ON comparisons(created_at DESC);
CREATE INDEX idx_comparisons_expires_at ON comparisons(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_comparisons_repository ON comparisons(repository);
CREATE INDEX idx_comparisons_content_hash ON comparisons(content_hash);
CREATE INDEX idx_comparisons_metadata_gin ON comparisons USING GIN(metadata jsonb_path_ops);
CREATE INDEX idx_comparisons_stats_gin ON comparisons USING GIN(stats jsonb_path_ops);
```

**Notes:**
- `compare_id`: UUID primary identifier for results
- `content_hash`: SHA-256 of (repository, chart_path, version1, version2, values_sha256)
- `metadata`/`stats`: Lightweight JSONB for queries without decompression
- `full_diff_compressed`: Complete StructuredDiffResult as gzip'd bytes
- `expires_at`: Automatic expiration (default: created_at + 30 days)

---

### 4.2 comparison_analytics

Materialized view for fast analytics queries.

```sql
CREATE MATERIALIZED VIEW comparison_analytics AS
SELECT 
  repository,
  chart_path,
  COUNT(*) as comparison_count,
  SUM(CASE WHEN (stats->'resources'->>'modified')::int > 0 THEN 1 ELSE 0 END) as with_changes,
  AVG((stats->'resources'->>'modified')::int) as avg_modified_resources,
  MAX(created_at) as last_comparison_at
FROM comparisons
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY repository, chart_path;

CREATE UNIQUE INDEX idx_analytics_pk ON comparison_analytics(repository, chart_path);

-- Refresh daily
CREATE OR REPLACE FUNCTION refresh_comparison_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY comparison_analytics;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.3 Cleanup function

Automated retention enforcement.

```sql
CREATE OR REPLACE FUNCTION delete_expired_comparisons()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  result_count BIGINT;
BEGIN
  DELETE FROM comparisons
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  RETURN QUERY SELECT result_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
-- SELECT cron.schedule('cleanup-expired-comparisons', '0 2 * * *', 'SELECT delete_expired_comparisons()');
```

---

## 5. Immutability guarantees

### 5.1 Application-level
- No update paths exist for stored results
- Replay endpoints are read-only
- Feature flag controls storage writes

### 5.2 Database-level (recommended)

Revoke UPDATE permissions to enforce immutability:

```sql
-- Create read-only role for application
CREATE ROLE chartimpact_app;
GRANT SELECT, INSERT, DELETE ON comparisons TO chartimpact_app;
REVOKE UPDATE ON comparisons FROM chartimpact_app;
```

---

## 6. API contracts (storage-facing)

### 6.1 Storage interface (Go)

```go
type ComparisonStore interface {
    // Save stores a new comparison result
    Save(ctx context.Context, result *SaveComparisonRequest) (*StoredComparison, error)
    
    // GetByID retrieves a comparison by its UUID
    GetByID(ctx context.Context, compareID uuid.UUID) (*StoredComparison, error)
    
    // GetByHash retrieves a comparison by content hash (for deduplication)
    GetByHash(ctx context.Context, contentHash string) (*StoredComparison, error)
    
    // List retrieves recent comparisons with filters
    List(ctx context.Context, filters ListFilters) ([]*ComparisonSummary, error)
    
    // GetAnalytics retrieves aggregate statistics
    GetAnalytics(ctx context.Context, filters AnalyticsFilters) (*AnalyticsResult, error)
    
    // DeleteExpired removes comparisons past their TTL
    DeleteExpired(ctx context.Context) (int64, error)
}
```

### 6.2 Create result

**Request:**
```go
type SaveComparisonRequest struct {
    CompareID          uuid.UUID
    ContentHash        string
    Repository         string
    ChartPath          string
    Version1           string
    Version2           string
    ValuesFile         *string
    ValuesSHA256       *string
    StructuredDiff     *StructuredDiffResult
    EngineVersion      string
    HelmVersion        string
    RetentionDays      int // Default: 30
}
```

**Response:**
```go
type StoredComparison struct {
    CompareID          uuid.UUID
    ContentHash        string
    Repository         string
    ChartPath          string
    Version1           string
    Version2           string
    StructuredDiff     *StructuredDiffResult
    CreatedAt          time.Time
    ExpiresAt          time.Time
    Deduplicated       bool // True if matched existing hash
}
```

### 6.3 Fetch result

**Request:**
```
GET /api/analysis/{compare_id}
```

**Response:**
```go
type ReplayResponse struct {
    Success            bool
    Comparison         *StoredComparison
    StructuredDiff     *StructuredDiffResult
    Metadata           *ReplayMetadata
    Error              string
}

type ReplayMetadata struct {
    StoredAt           time.Time
    ExpiresAt          time.Time
    IsExpired          bool
    IsDeduplicated     bool
    AccessCount        int
    UncompressedSize   int
    CompressionRatio   float64
}
```

---

## 7. Determinism & replay invariants

For a given `compare_id`:
- Returned data must be byte-for-byte identical
- Ordering must be deterministic:
  - Resources: by kind → namespace → name
  - Changes: by path (stable sort)
- UI rendering depends only on stored data
- No recomputation or rule re-evaluation

### Content hash computation

```go
func ComputeContentHash(req CompareRequest) string {
    h := sha256.New()
    h.Write([]byte(req.Repository))
    h.Write([]byte(req.ChartPath))
    h.Write([]byte(req.Version1))
    h.Write([]byte(req.Version2))
    if req.ValuesFile != "" {
        h.Write([]byte(req.ValuesFile))
    }
    if req.ValuesContent != "" {
        // Hash the values content
        vh := sha256.Sum256([]byte(req.ValuesContent))
        h.Write(vh[:])
    }
    return hex.EncodeToString(h.Sum(nil))
}
```

---

## 8. Tests (storage-focused)

### 8.1 Unit tests
- Insert + fetch roundtrip preserves values
- Compression/decompression is lossless
- Ordering is stable
- Content hash is deterministic
- Deduplication works correctly

### 8.2 Integration tests
- Create comparison → fetch via API → render → snapshot match
- Restart backend → fetch again → identical output
- Expired comparison returns 404 or expiration notice
- Duplicate request returns existing compare_id

### 8.3 Regression tests
- Load historical comparison after:
  - Rule changes
  - Helm version changes
  - Database schema migrations
- Assert identical structured diffs

---

## 9. Docker Compose (storage)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15-alpine
    container_name: chartimpact-postgres
    environment:
      POSTGRES_DB: chartimpact
      POSTGRES_USER: chartimpact
      POSTGRES_PASSWORD: chartimpact
    ports:
      - "5432:5432"
    volumes:
      - chartimpact_pgdata:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chartimpact"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - chartimpact

  backend:
    # ... existing backend config
    environment:
      # ... existing env vars
      - DATABASE_URL=postgres://chartimpact:chartimpact@postgres:5432/chartimpact?sslmode=disable
      - DB_MAX_CONNECTIONS=25
      - RESULT_TTL_DAYS=30
      - STORAGE_ENABLED=true
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  chartimpact_pgdata:

networks:
  chartimpact:
    driver: bridge
```

---

## 10. Non-goals (explicit)

- No recomputation on replay
- No secret redaction (store as-is)
- No user authentication (all results public)
- No real-time notifications
- No result versioning or history
- No distributed storage (single PostgreSQL instance)

---

## 11. Configuration

Environment variables for backend:

```bash
# Database connection
DATABASE_URL=postgres://user:pass@host:port/dbname?sslmode=disable
DB_MAX_CONNECTIONS=25
DB_CONNECTION_TIMEOUT=10s

# Storage behavior
STORAGE_ENABLED=true
RESULT_TTL_DAYS=30
COMPRESSION_ENABLED=true
COMPRESSION_THRESHOLD_KB=50

# Feature flags
DEDUPLICATION_ENABLED=true
ANALYTICS_ENABLED=true
```

---

## 12. Monitoring & Observability

Key metrics to track:

- **Storage metrics:**
  - Total comparisons stored
  - Storage size (compressed vs uncompressed)
  - Compression ratio
  - Deduplication hit rate

- **Performance metrics:**
  - Save latency (p50, p95, p99)
  - Load latency (including decompression)
  - Database connection pool utilization
  - Query performance (slow query log)

- **Business metrics:**
  - Comparisons per day
  - Most compared charts
  - Average result size
  - Expiration/cleanup effectiveness

---

## 13. Summary (one sentence)

ChartImpact stores immutable, deduplicated, compressed analysis artifacts with 30-day retention so that every result link is a permanent, exact replay of what was computed at creation time, while enabling analytics on comparison trends and deployment risks.
