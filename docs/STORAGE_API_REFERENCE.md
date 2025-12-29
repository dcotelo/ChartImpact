# ChartImpact Storage API Quick Reference

## New Endpoints

### GET /api/analysis/{id}
Retrieve a stored analysis result by UUID.

**Parameters:**
- `id` (path) - UUID of the stored comparison

**Response:**
```json
{
  "success": true,
  "comparison": {
    "success": true,
    "diff": "...",
    "structuredDiff": {...},
    "version1": "5.0.0",
    "version2": "5.1.0"
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

**Headers:**
- `X-Expiration-Warning: true` (when < 24 hours remain)

**Example:**
```bash
curl http://localhost:8080/api/analysis/550e8400-e29b-41d4-a716-446655440000
```

---

### GET /api/analysis
List stored analysis results with optional filtering.

**Query Parameters:**
- `repository` - Filter by repository URL
- `chartPath` - Filter by chart path
- `since` - ISO 8601 timestamp for start date
- `until` - ISO 8601 timestamp for end date
- `minChanges` - Minimum number of modified resources
- `limit` - Maximum results (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "comparisons": [
    {
      "compareId": "550e8400-e29b-41d4-a716-446655440000",
      "repository": "https://github.com/argoproj/argo-helm.git",
      "chartPath": "charts/argo-cd",
      "version1": "5.0.0",
      "version2": "5.1.0",
      "createdAt": "2024-01-15T10:30:00Z",
      "hasChanges": true,
      "modifiedResourcesCount": 5
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**Examples:**
```bash
# List all comparisons
curl http://localhost:8080/api/analysis

# Filter by repository
curl "http://localhost:8080/api/analysis?repository=https://github.com/argoproj/argo-helm.git"

# Filter by chart path
curl "http://localhost:8080/api/analysis?chartPath=charts/argo-cd"

# Date range
curl "http://localhost:8080/api/analysis?since=2024-01-01T00:00:00Z&until=2024-01-31T23:59:59Z"

# Pagination
curl "http://localhost:8080/api/analysis?limit=10&offset=20"

# Only comparisons with changes
curl "http://localhost:8080/api/analysis?minChanges=1"
```

---

### GET /api/analytics/charts/popular
Get analytics about most compared charts.

**Query Parameters:**
- `limit` - Maximum results (default: 10)

**Response:**
```json
{
  "success": true,
  "popularCharts": [
    {
      "repository": "https://github.com/argoproj/argo-helm.git",
      "chartPath": "charts/argo-cd",
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

**Examples:**
```bash
# Top 10 charts
curl http://localhost:8080/api/analytics/charts/popular

# Top 25 charts
curl "http://localhost:8080/api/analytics/charts/popular?limit=25"
```

---

## Modified Endpoints

### POST /api/compare
**New Behavior:**
- Checks content hash for deduplication
- Returns existing result if found (instant response)
- Stores new results asynchronously (non-blocking)
- Logs compression ratio and deduplication status

**Response Headers:**
- `X-Deduplication: true` (when cache hit)
- `X-Compare-ID: {uuid}` (UUID of stored result)

**Example:**
```bash
curl -X POST http://localhost:8080/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "https://github.com/argoproj/argo-helm.git",
    "chartPath": "charts/argo-cd",
    "version1": "5.0.0",
    "version2": "5.1.0"
  }' \
  -v  # See headers
```

---

### GET /api/health
**New Field:**
- `dbOk` (boolean) - Database connectivity status

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

**Status values:**
- `"ok"` - All systems operational
- `"degraded"` - One or more systems unavailable

---

## Frontend Routes

### /analysis/[id]
View stored analysis result.

**Features:**
- 📦 Permalink badge
- ⏰ Expiration warning (< 24 hours)
- "Re-run Fresh" button
- "Share" button (copy permalink)
- "New Analysis" button

**URL:** `http://localhost:3000/analysis/550e8400-e29b-41d4-a716-446655440000`

---

### /analytics
Analytics dashboard showing popular charts.

**Features:**
- Ranking badges (#1, #2, #3)
- Comparison counts
- Change rates
- Average modified resources
- Last comparison timestamp
- Responsive card layout

**URL:** `http://localhost:3000/analytics`

---

## Environment Variables

### Backend
```bash
STORAGE_ENABLED=true                    # Enable/disable storage
DATABASE_URL=postgres://user:pass@host:port/dbname?sslmode=disable
DB_MAX_CONNECTIONS=25                   # Connection pool size
RESULT_TTL_DAYS=30                      # Days to retain results
```

### Frontend
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Database Functions

### refresh_comparison_analytics()
Refresh the materialized analytics view.

```sql
SELECT refresh_comparison_analytics();
```

**Returns:** `VOID`

**Usage:** Call after bulk imports or for real-time analytics

---

### delete_expired_comparisons()
Delete comparisons past their expiration date.

```sql
SELECT delete_expired_comparisons();
```

**Returns:** `INTEGER` (count of deleted rows)

**Usage:** Schedule daily via cron or pg_cron

**Example:**
```bash
# Manual cleanup
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "SELECT delete_expired_comparisons();"

# Cron job (daily at 2 AM)
0 2 * * * docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c "SELECT delete_expired_comparisons();"
```

---

## Common Workflows

### 1. Execute and Share Comparison
```bash
# Execute comparison
RESULT=$(curl -s -X POST http://localhost:8080/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "https://github.com/argoproj/argo-helm.git",
    "chartPath": "charts/argo-cd",
    "version1": "5.0.0",
    "version2": "5.1.0"
  }')

# Extract compare_id (requires jq)
COMPARE_ID=$(echo $RESULT | jq -r '.compareId // .metadata.compareId')

# Share permalink
echo "http://localhost:3000/analysis/$COMPARE_ID"
```

---

### 2. View Popular Charts
```bash
# Get top 10 popular charts
curl http://localhost:8080/api/analytics/charts/popular | jq '.popularCharts'

# Find charts with high change rates
curl http://localhost:8080/api/analytics/charts/popular | \
  jq '.popularCharts[] | select(.withChanges / .comparisonCount > 0.7)'
```

---

### 3. Monitor Storage
```sql
-- Storage statistics
SELECT 
  COUNT(*) as total_comparisons,
  COUNT(DISTINCT content_hash) as unique_comparisons,
  SUM(CASE WHEN has_changes THEN 1 ELSE 0 END) as with_changes,
  AVG(compression_ratio) as avg_compression,
  pg_size_pretty(SUM(octet_length(full_diff_compressed))) as total_storage,
  pg_size_pretty(pg_database_size('chartimpact')) as db_size
FROM comparisons;

-- Upcoming expirations
SELECT 
  compare_id,
  repository,
  chart_path,
  expires_at,
  expires_at - NOW() as time_remaining
FROM comparisons
WHERE expires_at < NOW() + INTERVAL '7 days'
ORDER BY expires_at ASC;
```

---

### 4. Cleanup Old Results
```bash
# View expired results
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "SELECT COUNT(*) FROM comparisons WHERE expires_at < NOW();"

# Delete expired results
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "SELECT delete_expired_comparisons();"

# Vacuum to reclaim space
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "VACUUM FULL comparisons;"
```

---

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "error": "Analysis not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid UUID format"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database connection failed"
}
```

---

## Response Headers

### X-Compare-ID
UUID of the stored comparison result.

### X-Deduplication
Set to `"true"` when returning cached result.

### X-Expiration-Warning
Set to `"true"` when result expires in < 24 hours.

### X-Compression-Ratio
Compression ratio (e.g., `"0.78"` = 78% of original size).

---

## Performance Tips

1. **Use deduplication** - Identical comparisons return instantly
2. **Access stored results** - `/api/analysis/{id}` is 10-100x faster than live comparison
3. **Enable caching** - Set appropriate HTTP cache headers
4. **Limit analytics queries** - Use `limit` parameter for large datasets
5. **Schedule cleanup** - Run `delete_expired_comparisons()` during off-hours

---

## Troubleshooting

### "Database connection failed"
```bash
# Check postgres is running
docker-compose ps postgres

# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c "SELECT 1;"
```

### "Analysis not found"
- UUID may be incorrect (check format)
- Result may have been deleted (expired)
- Storage may be disabled (check STORAGE_ENABLED)

### High disk usage
```bash
# Check database size
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "SELECT pg_size_pretty(pg_database_size('chartimpact'));"

# Run cleanup
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "SELECT delete_expired_comparisons();"

# Vacuum database
docker exec chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "VACUUM FULL;"
```

---

## Quick Links

- **Documentation:** [STORAGE_SPEC.md](../STORAGE_SPEC.md)
- **Testing Guide:** [STORAGE_TESTING.md](STORAGE_TESTING.md)
- **Implementation Summary:** [STORAGE_IMPLEMENTATION_SUMMARY.md](STORAGE_IMPLEMENTATION_SUMMARY.md)
- **Main README:** [README.md](../README.md)
