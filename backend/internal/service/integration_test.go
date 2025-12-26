package service

import (
	"context"
	"os"
	"testing"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

// TestInternalDiffEngineIntegration tests the integration of internal diff engine with HelmService
func TestInternalDiffEngineIntegration(t *testing.T) {
	// Set environment variable to enable internal diff
	originalValue := os.Getenv("INTERNAL_DIFF_ENABLED")
	os.Setenv("INTERNAL_DIFF_ENABLED", "true")
	defer os.Setenv("INTERNAL_DIFF_ENABLED", originalValue)

	service := NewHelmService()
	ctx := context.Background()

	// Test basic comparison with internal diff engine
	t.Run("compare with no changes", func(t *testing.T) {
		manifest := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key: value
`
		diff, err := service.compareRendered(ctx, manifest, manifest, false)
		assert.NoError(t, err)
		assert.Contains(t, diff, "Total Changes:      0")
	})

	t.Run("compare with added resource", func(t *testing.T) {
		manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config1
`
		manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config1
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config2
`
		diff, err := service.compareRendered(ctx, manifest1, manifest2, false)
		assert.NoError(t, err)
		assert.Contains(t, diff, "Resources Added:    1")
		assert.Contains(t, diff, "config2")
	})

	t.Run("compare with modified resource", func(t *testing.T) {
		manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value1
`
		manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value2
`
		diff, err := service.compareRendered(ctx, manifest1, manifest2, false)
		assert.NoError(t, err)
		assert.Contains(t, diff, "Resources Modified: 1")
		assert.Contains(t, diff, "data.key")
	})

	t.Run("compare with label changes ignored", func(t *testing.T) {
		manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    version: v1
data:
  key: value
`
		manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    version: v2
data:
  key: value
`
		diff, err := service.compareRendered(ctx, manifest1, manifest2, true)
		assert.NoError(t, err)
		assert.Contains(t, diff, "Total Changes:      0")
	})

	t.Run("compare with label changes not ignored", func(t *testing.T) {
		manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    version: v1
`
		manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    version: v2
`
		diff, err := service.compareRendered(ctx, manifest1, manifest2, false)
		assert.NoError(t, err)
		assert.Contains(t, diff, "Resources Modified: 1")
		assert.Contains(t, diff, "metadata.labels.version")
	})
}

// TestDyffFallback tests that the service falls back to dyff when internal diff is disabled
func TestDyffFallback(t *testing.T) {
	// Ensure internal diff is disabled
	originalValue := os.Getenv("INTERNAL_DIFF_ENABLED")
	os.Setenv("INTERNAL_DIFF_ENABLED", "false")
	defer os.Setenv("INTERNAL_DIFF_ENABLED", originalValue)

	service := NewHelmService()
	ctx := context.Background()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value1
`
	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value2
`

	// This should use dyff or fall back to simple diff
	diff, err := service.compareRendered(ctx, manifest1, manifest2, false)
	assert.NoError(t, err)
	assert.NotEmpty(t, diff)
	// The exact format depends on whether dyff is available
}

// TestCompareRequest validates CompareRequest structure
func TestCompareRequestValidation(t *testing.T) {
	req := &models.CompareRequest{
		Repository: "https://github.com/test/repo.git",
		ChartPath:  "charts/myapp",
		Version1:   "v1.0.0",
		Version2:   "v1.1.0",
	}

	assert.Equal(t, "https://github.com/test/repo.git", req.Repository)
	assert.Equal(t, "charts/myapp", req.ChartPath)
	assert.Equal(t, "v1.0.0", req.Version1)
	assert.Equal(t, "v1.1.0", req.Version2)
}
