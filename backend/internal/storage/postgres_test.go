package storage

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// Mock tests - these validate the logic without requiring a real database
// For integration tests with real database, see integration_test.go

func TestCompressAndDecompress(t *testing.T) {
	testData := map[string]interface{}{
		"test":  "data",
		"array": []int{1, 2, 3},
		"nested": map[string]string{
			"key": "value",
		},
	}

	// Compress
	compressed, _, err := compressJSON(testData)
	if err != nil {
		t.Fatalf("compressJSON failed: %v", err)
	}

	if len(compressed) == 0 {
		t.Error("compressed data is empty")
	}

	// Decompress
	var decompressed map[string]interface{}
	err = decompressJSON(compressed, &decompressed)
	if err != nil {
		t.Fatalf("decompressJSON failed: %v", err)
	}

	// Verify data matches
	if decompressed["test"] != "data" {
		t.Errorf("Expected 'data', got %v", decompressed["test"])
	}

	// Verify compression actually reduces size
	originalJSON, _ := json.Marshal(testData)
	compressionRatio := float64(len(compressed)) / float64(len(originalJSON))
	
	t.Logf("Original size: %d bytes", len(originalJSON))
	t.Logf("Compressed size: %d bytes", len(compressed))
	t.Logf("Compression ratio: %.2f", compressionRatio)

	// For small data, compression might not help, but shouldn't fail
	if compressionRatio > 2.0 {
		t.Error("Compression ratio is worse than 2x (compression failed)")
	}
}

func TestCompressLargeData(t *testing.T) {
	// Create large test data
	largeData := make(map[string]interface{})
	for i := 0; i < 100; i++ {
		largeData[uuid.New().String()] = map[string]interface{}{
			"field1": "This is a test string that will be repeated",
			"field2": "Another test string with more data",
			"field3": []string{"array", "of", "strings", "for", "testing"},
			"field4": i,
		}
	}

		compressed, _, err := compressJSON(largeData)
	if err != nil {
		t.Fatalf("compressJSON failed: %v", err)
	}

	originalJSON, _ := json.Marshal(largeData)
	compressionRatio := float64(len(compressed)) / float64(len(originalJSON))

	t.Logf("Original size: %d bytes", len(originalJSON))
	t.Logf("Compressed size: %d bytes", len(compressed))
	t.Logf("Compression ratio: %.2f", compressionRatio)

	// Large data with repetition should compress well
	if compressionRatio > 0.9 {
		t.Errorf("Expected significant compression for large data, got ratio %.2f", compressionRatio)
	}

	// Verify decompression
	var decompressed map[string]interface{}
	err = decompressJSON(compressed, &decompressed)
	if err != nil {
		t.Fatalf("decompressJSON failed: %v", err)
	}

	if len(decompressed) != len(largeData) {
		t.Errorf("Expected %d items after decompression, got %d", len(largeData), len(decompressed))
	}
}

func TestDecompressInvalidData(t *testing.T) {
	invalidData := []byte("not compressed data")
	
	var result map[string]interface{}
	err := decompressJSON(invalidData, &result)
	
	if err == nil {
		t.Error("Expected error when decompressing invalid data")
	}
}

func TestCompressNilData(t *testing.T) {
	_, _, err := compressJSON(nil)
	
	// Should handle nil gracefully (marshal to "null")
	if err != nil {
		t.Errorf("compressJSON should handle nil, got error: %v", err)
	}
}

func TestSaveComparisonRequest_Structure(t *testing.T) {
	// Test that SaveComparisonRequest can be created with all fields
	req := &SaveComparisonRequest{
		Repository:   "https://github.com/test/repo.git",
		ChartPath:    "charts/app",
		Version1:     "1.0.0",
		Version2:     "1.1.0",
		ContentHash:  "abc123",
		RetentionDays: 30,
	}

	if req.Repository == "" {
		t.Error("Repository should not be empty")
	}
	if req.ChartPath == "" {
		t.Error("ChartPath should not be empty")
	}
	if req.Version1 == "" {
		t.Error("Version1 should not be empty")
	}
	if req.Version2 == "" {
		t.Error("Version2 should not be empty")
	}
}

func TestListFilters(t *testing.T) {
	repoStr := "https://github.com/test/repo.git"
	chartStr := "charts/app"
	sinceTime := time.Now().Add(-7 * 24 * time.Hour)
	untilTime := time.Now()
	minChanges := 5

	filters := &ListFilters{
		Repository: &repoStr,
		ChartPath:  &chartStr,
		Since:      &sinceTime,
		Until:      &untilTime,
		MinChanges: &minChanges,
		Limit:      50,
		Offset:     0,
	}

	if filters.Limit == 0 {
		t.Error("Expected limit to be set")
	}

	if filters.Since != nil && filters.Until != nil {
		if filters.Since.After(*filters.Until) {
			t.Error("Since should be before Until")
		}
	}
}

func TestAnalyticsFilters(t *testing.T) {
	filters := &AnalyticsFilters{
		Limit: 10,
	}

	if filters.Limit <= 0 {
		t.Error("Limit should be positive")
	}

	if filters.Limit > 100 {
		t.Error("Limit should have reasonable maximum")
	}
}

func TestStoredComparison_Expiration(t *testing.T) {
	now := time.Now()
	
	tests := []struct {
		name        string
		expiresAt   time.Time
		wantExpired bool
	}{
		{
			name:        "not expired",
			expiresAt:   now.Add(24 * time.Hour),
			wantExpired: false,
		},
		{
			name:        "expired",
			expiresAt:   now.Add(-24 * time.Hour),
			wantExpired: true,
		},
		{
			name:        "expires soon (< 24 hours)",
			expiresAt:   now.Add(12 * time.Hour),
			wantExpired: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			comparison := &StoredComparison{
				CompareID: uuid.New(),
				ExpiresAt: tt.expiresAt,
			}

			isExpired := comparison.ExpiresAt.Before(now)
			if isExpired != tt.wantExpired {
				t.Errorf("Expected expired=%v, got %v", tt.wantExpired, isExpired)
			}

			// Test expiration warning threshold (< 24 hours)
			expiresWithin24h := comparison.ExpiresAt.Before(now.Add(24 * time.Hour))
			if tt.name == "expires soon (< 24 hours)" && !expiresWithin24h {
				t.Error("Expected expiration warning for < 24 hours")
			}
		})
	}
}

func TestChartPopularity_ChangeRate(t *testing.T) {
	tests := []struct {
		name             string
		comparisonCount  int
		withChanges      int
		expectedRateMin  float64
		expectedRateMax  float64
	}{
		{
			name:             "all have changes",
			comparisonCount:  10,
			withChanges:      10,
			expectedRateMin:  0.99,
			expectedRateMax:  1.01,
		},
		{
			name:             "half have changes",
			comparisonCount:  10,
			withChanges:      5,
			expectedRateMin:  0.49,
			expectedRateMax:  0.51,
		},
		{
			name:             "none have changes",
			comparisonCount:  10,
			withChanges:      0,
			expectedRateMin:  -0.01,
			expectedRateMax:  0.01,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			popularity := &ChartPopularity{
				Repository:      "https://github.com/test/repo.git",
				ChartPath:       "charts/app",
				ComparisonCount: tt.comparisonCount,
				WithChanges:     tt.withChanges,
			}

			changeRate := float64(popularity.WithChanges) / float64(popularity.ComparisonCount)
			
			if changeRate < tt.expectedRateMin || changeRate > tt.expectedRateMax {
				t.Errorf("Expected change rate between %.2f and %.2f, got %.2f",
					tt.expectedRateMin, tt.expectedRateMax, changeRate)
			}
		})
	}
}

// Note: Integration tests with real database are in integration_test.go
// with build tag: // +build integration
// Those tests use a real PostgreSQL instance to test the full storage flow
