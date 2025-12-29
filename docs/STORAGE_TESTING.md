# Storage Feature Testing Guide

This guide provides step-by-step instructions for testing the ChartImpact storage and replay features.

## Prerequisites

- Docker and Docker Compose installed
- Git installed
- Browser for testing the web interface

## Quick Start

```bash
# Start all services (frontend, backend, PostgreSQL)
docker-compose up

# Wait for services to be healthy
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# PostgreSQL: localhost:5432
```

## Test Scenarios

### 1. Basic Storage and Replay

**Objective:** Verify that comparison results are stored and can be replayed.

1. **Execute a comparison:**
   - Navigate to http://localhost:3000
   - Fill in comparison form:
     - Repository: `https://github.com/argoproj/argo-helm.git`
     - Chart Path: `charts/argo-cd`
     - Version 1: `5.0.0`
     - Version 2: `5.1.0`
   - Click "Compare Versions"
   - Wait for analysis to complete

2. **Verify storage:**
   ```bash
   # Connect to database
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact
   
   # Check stored comparisons
   SELECT compare_id, repository, chart_path, version_1, version_2, 
          created_at, expires_at, has_changes, modified_resources_count
   FROM comparisons
   ORDER BY created_at DESC
   LIMIT 5;
   
   # Check compression
   SELECT compare_id, 
          pg_size_pretty(octet_length(full_diff_compressed)) as compressed_size,
          compression_ratio
   FROM comparisons
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Access stored result:**
   - Copy the `compare_id` from the database query
   - Navigate to `http://localhost:3000/analysis/{compare_id}`
   - Verify the page loads with:
     - 📦 "Stored Analysis" badge
     - Stored timestamp
     - Expiration date
     - Original comparison parameters
     - Full diff results
     - Action buttons (Re-run Fresh, Share, New Analysis)

### 2. Deduplication

**Objective:** Verify that identical comparisons are deduplicated.

1. **Execute first comparison:**
   - Use the same parameters as Test 1
   - Note the result URL (e.g., `/analysis/{uuid-1}`)

2. **Execute identical comparison:**
   - Use the exact same parameters again
   - Note the result URL

3. **Verify deduplication:**
   ```bash
   # Check content hash
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT content_hash, COUNT(*) as count, 
             array_agg(compare_id) as comparison_ids
      FROM comparisons
      GROUP BY content_hash
      HAVING COUNT(*) > 1;"
   ```

4. **Expected behavior:**
   - Backend logs should show: "Cache hit: returning existing result"
   - Both URLs should point to the same `compare_id`
   - Database should only have one entry for this comparison
   - The stored result metadata should show `isDeduplicated: true`

### 3. Compression

**Objective:** Verify that large results are compressed efficiently.

1. **Execute comparison with large diff:**
   - Use a comparison with many resource changes
   - Example:
     - Repository: `https://github.com/prometheus-community/helm-charts.git`
     - Chart Path: `charts/kube-prometheus-stack`
     - Version 1: `45.0.0`
     - Version 2: `51.0.0`

2. **Check compression ratio:**
   ```bash
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT compare_id,
             pg_size_pretty(length(metadata::text)) as metadata_size,
             pg_size_pretty(octet_length(full_diff_compressed)) as compressed_size,
             compression_ratio
      FROM comparisons
      ORDER BY created_at DESC
      LIMIT 1;"
   ```

3. **Expected behavior:**
   - Compression ratio should be around 0.7-0.8 (70-80% of original)
   - Backend logs should show compression details
   - Stored result should decompress and display correctly

### 4. Expiration and Cleanup

**Objective:** Verify that expired results are handled correctly.

1. **Create expired result (manual):**
   ```bash
   # Update a result to expire in the past
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "UPDATE comparisons 
      SET expires_at = NOW() - INTERVAL '1 day'
      WHERE compare_id = (SELECT compare_id FROM comparisons 
                          ORDER BY created_at DESC LIMIT 1)
      RETURNING compare_id, expires_at;"
   ```

2. **Access expired result:**
   - Navigate to the expired result's URL
   - Should still display with warning: "This analysis has expired"

3. **Test cleanup function:**
   ```bash
   # Run cleanup
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT delete_expired_comparisons();"
   
   # Verify deletion
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT COUNT(*) as expired_count
      FROM comparisons
      WHERE expires_at < NOW();"
   ```

4. **Expected behavior:**
   - Cleanup function returns count of deleted records
   - Expired records are removed
   - Accessing deleted results returns 404

### 5. Expiration Warnings

**Objective:** Verify that results expiring soon show warnings.

1. **Create result expiring soon (manual):**
   ```bash
   # Update a result to expire in 12 hours
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "UPDATE comparisons 
      SET expires_at = NOW() + INTERVAL '12 hours'
      WHERE compare_id = (SELECT compare_id FROM comparisons 
                          ORDER BY created_at DESC LIMIT 1)
      RETURNING compare_id, expires_at;"
   ```

2. **Access result:**
   - Navigate to the result's URL
   - Should display:
     - ⏰ "Expires in X hours" warning badge
     - Yellow/orange warning styling
     - Suggestion to re-run for fresh results

3. **Expected behavior:**
   - Warning appears when < 24 hours remain
   - API response includes `X-Expiration-Warning` header
   - UI prominently displays expiration time

### 6. Analytics Dashboard

**Objective:** Verify analytics features work correctly.

1. **Generate multiple comparisons:**
   - Execute 3-5 different comparisons
   - Use different repositories and chart paths
   - Execute one comparison twice (for deduplication test)

2. **Access analytics:**
   - Navigate to http://localhost:3000/analytics
   - Should display:
     - Total comparisons count
     - Most compared charts
     - Comparison counts per chart
     - Change rate (% with modifications)
     - Average modified resources
     - Last comparison timestamp

3. **Verify analytics data:**
   ```bash
   # Query materialized view
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT * FROM comparison_analytics
      ORDER BY comparison_count DESC
      LIMIT 5;"
   
   # Refresh view
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT refresh_comparison_analytics();"
   ```

4. **Expected behavior:**
   - Popular charts ranked by comparison count
   - Change rate calculated correctly
   - Analytics update when new comparisons added

### 7. Re-run Fresh

**Objective:** Verify re-run functionality from stored results.

1. **Access stored result:**
   - Navigate to any `/analysis/{uuid}` page

2. **Click "Re-run Fresh":**
   - Should redirect to `/analysis?repo=...&path=...&v1=...&v2=...`
   - Should execute new comparison
   - Should create new stored result (different UUID)

3. **Verify new result:**
   ```bash
   # Check for multiple results with same parameters
   docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
     "SELECT compare_id, content_hash, created_at
      FROM comparisons
      WHERE repository = 'https://github.com/argoproj/argo-helm.git'
      ORDER BY created_at DESC;"
   ```

4. **Expected behavior:**
   - New comparison executes (not cached)
   - New UUID assigned
   - Same content_hash as original (if repo unchanged)
   - Both results remain accessible

### 8. Share Permalink

**Objective:** Verify permalink sharing functionality.

1. **From live analysis page:**
   - Execute a comparison
   - Click "🔗 Share" button on results page
   - Should show "✓ Copied!" confirmation

2. **From stored analysis page:**
   - Navigate to `/analysis/{uuid}`
   - Click "Share" button
   - Should copy permalink to clipboard

3. **Test permalink:**
   - Paste URL in new browser tab/window
   - Should load the exact same result
   - Should work across different sessions

4. **Expected behavior:**
   - URL format: `http://localhost:3000/analysis/{uuid}`
   - Permalink loads instantly (no computation)
   - Same result visible to all users

### 9. Database Health Check

**Objective:** Verify health check includes database status.

1. **Check health endpoint:**
   ```bash
   curl http://localhost:8080/api/health | jq
   ```

2. **Expected response:**
   ```json
   {
     "status": "ok",
     "version": "1.0.0",
     "helmOk": true,
     "gitOk": true,
     "dbOk": true
   }
   ```

3. **Test with database down:**
   ```bash
   # Stop postgres
   docker-compose stop postgres
   
   # Check health
   curl http://localhost:8080/api/health | jq
   
   # Should show dbOk: false and status: "degraded"
   
   # Restart postgres
   docker-compose start postgres
   ```

### 10. Storage Feature Flag

**Objective:** Verify storage can be disabled without breaking functionality.

1. **Disable storage:**
   ```bash
   # Edit docker-compose.yml
   # Set STORAGE_ENABLED=false for backend service
   
   docker-compose restart backend
   ```

2. **Execute comparison:**
   - Should work normally
   - Results not stored to database
   - Share button still works (uses URL params)
   - Analytics page unavailable

3. **Re-enable storage:**
   ```bash
   # Set STORAGE_ENABLED=true
   docker-compose restart backend
   ```

4. **Expected behavior:**
   - App works with or without storage
   - Feature degrades gracefully
   - No errors in logs

## Performance Testing

### Load Test Storage

```bash
# Execute multiple comparisons in parallel
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/compare \
    -H "Content-Type: application/json" \
    -d '{
      "repository": "https://github.com/argoproj/argo-helm.git",
      "chartPath": "charts/argo-cd",
      "version1": "5.0.0",
      "version2": "5.1.'$i'"
    }' &
done
wait

# Check database
docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c \
  "SELECT COUNT(*) as total_stored FROM comparisons;"
```

### Measure Response Times

```bash
# Live comparison (no cache)
time curl -X POST http://localhost:8080/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "https://github.com/argoproj/argo-helm.git",
    "chartPath": "charts/argo-cd",
    "version1": "5.0.0",
    "version2": "5.1.0"
  }'

# Replay (from storage)
COMPARE_ID="..."  # Use actual UUID
time curl http://localhost:8080/api/analysis/$COMPARE_ID
```

**Expected performance:**
- Live comparison: 5-30 seconds (depends on chart size)
- Replay: < 1 second
- Cached comparison (dedup): < 1 second

## Troubleshooting

### Database connection issues

```bash
# Check postgres is running
docker-compose ps postgres

# Check backend logs
docker-compose logs backend | grep -i "database\|storage\|postgres"

# Verify connection
docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c "SELECT 1;"
```

### Migration issues

```bash
# Check applied migrations
docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact -c "\dt"

# Manually apply migrations
docker exec -i chartimpact-postgres psql -U chartimpact -d chartimpact < backend/migrations/001_create_comparisons_table.up.sql
```

### Storage not working

```bash
# Check environment variables
docker-compose exec backend env | grep -E "STORAGE|DATABASE"

# Check backend logs for storage initialization
docker-compose logs backend | grep -i "storage initialized\|postgres"

# Verify STORAGE_ENABLED=true
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (clears database)
docker-compose down -v

# Remove all data
docker-compose down -v --remove-orphans
```

## Manual Database Inspection

```bash
# Connect to database
docker exec -it chartimpact-postgres psql -U chartimpact -d chartimpact

# View all comparisons
SELECT compare_id, repository, chart_path, version_1, version_2, 
       created_at, has_changes, modified_resources_count
FROM comparisons
ORDER BY created_at DESC;

# View storage statistics
SELECT 
  COUNT(*) as total_comparisons,
  COUNT(DISTINCT content_hash) as unique_comparisons,
  SUM(CASE WHEN has_changes THEN 1 ELSE 0 END) as with_changes,
  AVG(compression_ratio) as avg_compression,
  pg_size_pretty(SUM(octet_length(full_diff_compressed))) as total_storage
FROM comparisons;

# View popular charts
SELECT * FROM comparison_analytics 
ORDER BY comparison_count DESC 
LIMIT 10;

# Cleanup expired
SELECT delete_expired_comparisons();
```

## Success Criteria

- ✅ Comparisons are stored to PostgreSQL with gzip compression
- ✅ Identical comparisons are deduplicated (same content_hash)
- ✅ Stored results can be replayed via `/analysis/{uuid}` URLs
- ✅ Compression ratio is ~70-80%
- ✅ Expired results are cleaned up correctly
- ✅ Expiration warnings display when < 24 hours remain
- ✅ Analytics dashboard shows popular charts and trends
- ✅ Re-run fresh executes new comparison with same parameters
- ✅ Share permalink copies URL to clipboard
- ✅ Health check includes database status
- ✅ Storage can be disabled via feature flag
- ✅ No performance degradation for live comparisons
- ✅ Replay is significantly faster than live execution

## Automated Testing

For automated testing, see:
- [backend/internal/storage/postgres_test.go](../backend/internal/storage/postgres_test.go) - Unit tests for storage layer
- [backend/internal/api/handlers/handlers_test.go](../backend/internal/api/handlers/handlers_test.go) - API handler tests
- [TESTING.md](../TESTING.md) - Overall testing strategy
