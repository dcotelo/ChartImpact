// +build integration

package storage

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Integration tests require a real PostgreSQL database
// Run with: go test -tags=integration ./internal/storage/...
//
// Set DATABASE_URL environment variable:
// export DATABASE_URL="postgres://chartimpact:chartimpact@localhost:5432/chartimpact_test?sslmode=disable"

func setupTestDB(t *testing.T) *PostgresStore {
	t.Helper()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration tests")
	}

	// Replace production database with test database
	// This assumes you have a separate test database
	// You can use testcontainers for a fully isolated test database

	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Clean up test data before running tests
	_, err = db.Exec("DELETE FROM comparisons WHERE repository LIKE '%test%'")
	if err != nil {
		t.Fatalf("Failed to clean test data: %v", err)
	}

	store := &PostgresStore{db: db}
	return store
}

func teardownTestDB(t *testing.T, store *PostgresStore) {
	t.Helper()
	
	// Clean up test data
	_, err := store.db.Exec("DELETE FROM comparisons WHERE repository LIKE '%test%'")
	if err != nil {
		t.Logf("Warning: Failed to clean up test data: %v", err)
	}

	store.Close()
}

func TestPostgresStore_SaveAndGetByID(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()
	req := &SaveComparisonRequest{
		Repository: "https://github.com/test/integration-repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		Result: map[string]interface{}{
			"diff": "test diff content",
			"structuredDiff": map[string]interface{}{
				"added":    5,
				"modified": 3,
				"removed":  1,
			},
		},
		ValuesFile:    stringPtr("values.yaml"),
		ValuesContent: stringPtr("replicaCount: 3\nimage:\n  tag: v1.0.0"),
		ExpiresAt:     time.Now().Add(30 * 24 * time.Hour),
	}

	// Save comparison
	compareID, err := store.Save(ctx, req)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Verify UUID format
	_, err = uuid.Parse(compareID)
	if err != nil {
		t.Errorf("Invalid UUID returned: %v", err)
	}

	// Get by ID
	stored, err := store.GetByID(ctx, compareID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	// Verify stored data
	if stored.CompareID != compareID {
		t.Errorf("Expected CompareID %s, got %s", compareID, stored.CompareID)
	}
	if stored.Repository != req.Repository {
		t.Errorf("Expected repository %s, got %s", req.Repository, stored.Repository)
	}
	if stored.ChartPath != req.ChartPath {
		t.Errorf("Expected chart path %s, got %s", req.ChartPath, stored.ChartPath)
	}
	if stored.Version1 != req.Version1 {
		t.Errorf("Expected version1 %s, got %s", req.Version1, stored.Version1)
	}
	if stored.Version2 != req.Version2 {
		t.Errorf("Expected version2 %s, got %s", req.Version2, stored.Version2)
	}

	// Verify result data (should be decompressed)
	if stored.StructuredDiff == nil {
		t.Error("Expected StructuredDiff to be populated")
	}

	// Verify metadata
	if stored.ContentHash == "" {
		t.Error("Expected ContentHash to be set")
	}
	if stored.CompressionRatio <= 0 {
		t.Error("Expected positive CompressionRatio")
	}
}

func TestPostgresStore_Deduplication(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()
	req := &SaveComparisonRequest{
		Repository: "https://github.com/test/dedup-repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		Result: map[string]interface{}{
			"diff": "test diff",
		},
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}

	// Save first time
	compareID1, err := store.Save(ctx, req)
	if err != nil {
		t.Fatalf("First Save failed: %v", err)
	}

	// Compute content hash
	contentHash := ComputeContentHash(req)

	// Get by hash
	stored, err := store.GetByHash(ctx, contentHash)
	if err != nil {
		t.Fatalf("GetByHash failed: %v", err)
	}

	if stored.CompareID != compareID1 {
		t.Errorf("Expected CompareID %s from GetByHash, got %s", compareID1, stored.CompareID)
	}

	// Save again (should update existing)
	compareID2, err := store.Save(ctx, req)
	if err != nil {
		t.Fatalf("Second Save failed: %v", err)
	}

	// Should return same ID (deduplication)
	if compareID1 != compareID2 {
		t.Errorf("Expected deduplication to return same ID, got %s and %s", compareID1, compareID2)
	}

	// Verify access count increased
	stored2, err := store.GetByID(ctx, compareID1)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	if stored2.AccessCount <= stored.AccessCount {
		t.Error("Expected AccessCount to increase after duplicate save")
	}
}

func TestPostgresStore_List(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()

	// Create test comparisons
	testRepo := "https://github.com/test/list-repo.git"
	for i := 1; i <= 5; i++ {
		req := &SaveComparisonRequest{
			Repository: testRepo,
			ChartPath:  "charts/app",
			Version1:   "1.0.0",
			Version2:   "1.0." + string(rune('0'+i)),
			Result: map[string]interface{}{
				"diff": "test diff " + string(rune('0'+i)),
			},
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
		}
		_, err := store.Save(ctx, req)
		if err != nil {
			t.Fatalf("Failed to save test comparison %d: %v", i, err)
		}
	}

	// List all for repository
	filters := &ListFilters{
		Repository: &testRepo,
		Limit:      10,
		Offset:     0,
	}

	comparisons, err := store.List(ctx, filters)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(comparisons) != 5 {
		t.Errorf("Expected 5 comparisons, got %d", len(comparisons))
	}

	// Verify ordering (most recent first)
	for i := 0; i < len(comparisons)-1; i++ {
		if comparisons[i].CreatedAt.Before(comparisons[i+1].CreatedAt) {
			t.Error("Expected comparisons to be ordered by CreatedAt DESC")
		}
	}

	// Test pagination
	filters.Limit = 2
	filters.Offset = 0
	page1, err := store.List(ctx, filters)
	if err != nil {
		t.Fatalf("List page 1 failed: %v", err)
	}
	if len(page1) != 2 {
		t.Errorf("Expected 2 comparisons in page 1, got %d", len(page1))
	}

	filters.Offset = 2
	page2, err := store.List(ctx, filters)
	if err != nil {
		t.Fatalf("List page 2 failed: %v", err)
	}
	if len(page2) != 2 {
		t.Errorf("Expected 2 comparisons in page 2, got %d", len(page2))
	}

	// Verify pages don't overlap
	if page1[0].CompareID == page2[0].CompareID {
		t.Error("Pages should not contain same comparison")
	}
}

func TestPostgresStore_GetAnalytics(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()

	// Create test comparisons for analytics
	testRepo := "https://github.com/test/analytics-repo.git"
	for i := 0; i < 3; i++ {
		req := &SaveComparisonRequest{
			Repository: testRepo,
			ChartPath:  "charts/app",
			Version1:   "1.0.0",
			Version2:   "1.1.0",
			Result: map[string]interface{}{
				"diff": "test diff",
			},
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
		}
		_, err := store.Save(ctx, req)
		if err != nil {
			t.Fatalf("Failed to save test comparison: %v", err)
		}
	}

	// Get analytics
	filters := &AnalyticsFilters{
		Limit: 10,
	}

	result, err := store.GetAnalytics(ctx, filters)
	if err != nil {
		t.Fatalf("GetAnalytics failed: %v", err)
	}

	// Verify structure
	if len(result.PopularCharts) == 0 {
		t.Error("Expected at least one popular chart")
	}

	if result.TotalComparisons == 0 {
		t.Error("Expected positive TotalComparisons")
	}

	// Find our test chart
	var foundTestChart bool
	for _, chart := range result.PopularCharts {
		if chart.Repository == testRepo {
			foundTestChart = true
			if chart.ComparisonCount < 3 {
				t.Errorf("Expected at least 3 comparisons for test chart, got %d", chart.ComparisonCount)
			}
		}
	}

	if !foundTestChart {
		t.Error("Test chart not found in popular charts")
	}
}

func TestPostgresStore_DeleteExpired(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()

	// Create expired comparison
	expiredReq := &SaveComparisonRequest{
		Repository: "https://github.com/test/expired-repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		Result: map[string]interface{}{
			"diff": "expired",
		},
		ExpiresAt: time.Now().Add(-24 * time.Hour), // Already expired
	}

	expiredID, err := store.Save(ctx, expiredReq)
	if err != nil {
		t.Fatalf("Failed to save expired comparison: %v", err)
	}

	// Create valid comparison
	validReq := &SaveComparisonRequest{
		Repository: "https://github.com/test/valid-repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		Result: map[string]interface{}{
			"diff": "valid",
		},
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}

	validID, err := store.Save(ctx, validReq)
	if err != nil {
		t.Fatalf("Failed to save valid comparison: %v", err)
	}

	// Delete expired
	deletedCount, err := store.DeleteExpired(ctx)
	if err != nil {
		t.Fatalf("DeleteExpired failed: %v", err)
	}

	if deletedCount == 0 {
		t.Error("Expected at least one expired comparison to be deleted")
	}

	// Verify expired is gone
	_, err = store.GetByID(ctx, expiredID)
	if err == nil {
		t.Error("Expected error when getting deleted comparison")
	}

	// Verify valid still exists
	_, err = store.GetByID(ctx, validID)
	if err != nil {
		t.Errorf("Valid comparison should still exist: %v", err)
	}
}

func TestPostgresStore_UpdateLastAccessed(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()

	req := &SaveComparisonRequest{
		Repository: "https://github.com/test/access-repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		Result: map[string]interface{}{
			"diff": "test",
		},
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}

	compareID, err := store.Save(ctx, req)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Get initial state
	initial, err := store.GetByID(ctx, compareID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	initialAccessTime := initial.LastAccessedAt
	initialAccessCount := initial.AccessCount

	// Wait a bit
	time.Sleep(100 * time.Millisecond)

	// Access again
	err = store.UpdateLastAccessed(ctx, compareID)
	if err != nil {
		t.Fatalf("UpdateLastAccessed failed: %v", err)
	}

	// Get updated state
	updated, err := store.GetByID(ctx, compareID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	// Verify last_accessed_at was updated
	if !updated.LastAccessedAt.After(initialAccessTime) {
		t.Error("Expected LastAccessedAt to be updated")
	}

	// Verify access_count was incremented
	if updated.AccessCount != initialAccessCount+1 {
		t.Errorf("Expected AccessCount %d, got %d", initialAccessCount+1, updated.AccessCount)
	}
}

func TestPostgresStore_Compression(t *testing.T) {
	store := setupTestDB(t)
	defer teardownTestDB(t, store)

	ctx := context.Background()

	// Create large result for compression test
	largeResult := make(map[string]interface{})
	for i := 0; i < 100; i++ {
		largeResult["resource_"+string(rune('0'+i))] = map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata": map[string]interface{}{
				"name": "app-" + string(rune('0'+i)),
			},
			"spec": map[string]interface{}{
				"replicas": 3,
				"selector": map[string]interface{}{
					"matchLabels": map[string]string{
						"app": "test",
					},
				},
			},
		}
	}

	req := &SaveComparisonRequest{
		Repository: "https://github.com/test/compression-repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		Result:     largeResult,
		ExpiresAt:  time.Now().Add(30 * 24 * time.Hour),
	}

	compareID, err := store.Save(ctx, req)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Retrieve and check compression ratio
	stored, err := store.GetByID(ctx, compareID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	t.Logf("Compression ratio: %.2f", stored.CompressionRatio)

	// For large data with repetition, expect good compression
	if stored.CompressionRatio > 0.8 {
		t.Errorf("Expected compression ratio < 0.8 for large repetitive data, got %.2f", stored.CompressionRatio)
	}

	// Verify decompressed data matches
	if len(stored.StructuredDiff) != len(largeResult) {
		t.Errorf("Expected %d items after decompression, got %d", len(largeResult), len(stored.StructuredDiff))
	}
}
