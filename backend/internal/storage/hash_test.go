package storage

import (
	"testing"

	"github.com/dcotelo/chartimpact/backend/internal/models"
)

func TestComputeValuesSHA256(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		expect string // "empty" or "hash"
	}{
		{
			name:   "empty string",
			input:  "",
			expect: "empty", // Empty input returns empty string intentionally
		},
		{
			name:   "simple values",
			input:  "replicaCount: 3",
			expect: "hash",
		},
		{
			name:   "complex values",
			input:  "replicaCount: 3\nimage:\n  tag: v1.0.0",
			expect: "hash",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ComputeValuesSHA256(tt.input)

			if tt.expect == "empty" {
				if result != "" {
					t.Errorf("Expected empty string for empty input, got: %s", result)
				}
			} else {
				if result == "" {
					t.Error("ComputeValuesSHA256 returned empty string for non-empty input")
				}
				// Verify it returns a 64-character hex string (SHA-256)
				if len(result) != 64 {
					t.Errorf("Expected 64 character hash, got %d characters: %s", len(result), result)
				}
			}
		})
	}
}

func TestComputeContentHash_Deterministic(t *testing.T) {
	valuesFile := "values.yaml"
	req := &models.CompareRequest{
		Repository: "https://github.com/test/repo.git",
		ChartPath:  "charts/app",
		Version1:   "1.0.0",
		Version2:   "1.1.0",
		ValuesFile: &valuesFile,
	}

	// Compute hash twice
	hash1 := ComputeContentHash(req)
	hash2 := ComputeContentHash(req)

	if hash1 != hash2 {
		t.Errorf("ComputeContentHash not deterministic: %s != %s", hash1, hash2)
	}

	if len(hash1) != 64 {
		t.Errorf("Expected 64 character hash, got %d", len(hash1))
	}
}

func TestComputeContentHash_DifferentInputs(t *testing.T) {
	tests := []struct {
		name string
		req1 *models.CompareRequest
		req2 *models.CompareRequest
	}{
		{
			name: "different repository",
			req1: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/app",
				Version1:   "1.0.0",
				Version2:   "1.1.0",
			},
			req2: &models.CompareRequest{
				Repository: "https://github.com/other/repo.git",
				ChartPath:  "charts/app",
				Version1:   "1.0.0",
				Version2:   "1.1.0",
			},
		},
		{
			name: "different chart path",
			req1: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/app",
				Version1:   "1.0.0",
				Version2:   "1.1.0",
			},
			req2: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/other",
				Version1:   "1.0.0",
				Version2:   "1.1.0",
			},
		},
		{
			name: "different version1",
			req1: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/app",
				Version1:   "1.0.0",
				Version2:   "1.1.0",
			},
			req2: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/app",
				Version1:   "2.0.0",
				Version2:   "1.1.0",
			},
		},
		{
			name: "different version2",
			req1: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/app",
				Version1:   "1.0.0",
				Version2:   "1.1.0",
			},
			req2: &models.CompareRequest{
				Repository: "https://github.com/test/repo.git",
				ChartPath:  "charts/app",
				Version1:   "1.0.0",
				Version2:   "2.0.0",
			},
		},
		{
			name: "different values content",
			req1: &models.CompareRequest{
				Repository:    "https://github.com/test/repo.git",
				ChartPath:     "charts/app",
				Version1:      "1.0.0",
				Version2:      "1.1.0",
				ValuesContent: stringPtr("replicaCount: 3"),
			},
			req2: &models.CompareRequest{
				Repository:    "https://github.com/test/repo.git",
				ChartPath:     "charts/app",
				Version1:      "1.0.0",
				Version2:      "1.1.0",
				ValuesContent: stringPtr("replicaCount: 5"),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash1 := ComputeContentHash(tt.req1)
			hash2 := ComputeContentHash(tt.req2)

			if hash1 == hash2 {
				t.Errorf("Expected different hashes for %s, but got same hash", tt.name)
			}
		})
	}
}

func TestComputeContentHash_EmptyValues(t *testing.T) {
	emptyStr := ""
	req1 := &models.CompareRequest{
		Repository:    "https://github.com/test/repo.git",
		ChartPath:     "charts/app",
		Version1:      "1.0.0",
		Version2:      "1.1.0",
		ValuesFile:    &emptyStr,
		ValuesContent: &emptyStr,
	}

	req2 := &models.CompareRequest{
		Repository:    "https://github.com/test/repo.git",
		ChartPath:     "charts/app",
		Version1:      "1.0.0",
		Version2:      "1.1.0",
		ValuesFile:    &emptyStr,
		ValuesContent: &emptyStr,
	}

	hash1 := ComputeContentHash(req1)
	hash2 := ComputeContentHash(req2)

	// Same inputs should produce same hash
	if hash1 != hash2 {
		t.Errorf("Expected same hash for identical requests, got %s != %s", hash1, hash2)
	}
}

func TestComputeContentHash_IgnoreLabelsOption(t *testing.T) {
	req1 := &models.CompareRequest{
		Repository:   "https://github.com/test/repo.git",
		ChartPath:    "charts/app",
		Version1:     "1.0.0",
		Version2:     "1.1.0",
		IgnoreLabels: true,
	}

	req2 := &models.CompareRequest{
		Repository:   "https://github.com/test/repo.git",
		ChartPath:    "charts/app",
		Version1:     "1.0.0",
		Version2:     "1.1.0",
		IgnoreLabels: false,
	}

	hash1 := ComputeContentHash(req1)
	hash2 := ComputeContentHash(req2)

	// Different ignore labels should produce different hashes
	if hash1 == hash2 {
		t.Error("Expected different hashes for different IgnoreLabels values")
	}
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
