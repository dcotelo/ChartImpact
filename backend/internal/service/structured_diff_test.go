package service

import (
	"context"
	"os"
	"testing"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestStructuredDiffInResponse verifies that the structured diff is included in the response
func TestStructuredDiffInResponse(t *testing.T) {
	// Ensure internal diff is enabled
	originalValue := os.Getenv("INTERNAL_DIFF_ENABLED")
	os.Setenv("INTERNAL_DIFF_ENABLED", "true")
	defer os.Setenv("INTERNAL_DIFF_ENABLED", originalValue)

	service := NewHelmService()
	ctx := context.Background()

	manifest1 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: app
        image: api:v1.0.0
`

	manifest2 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: api:v2.0.0
`

	diffResult, diffRaw, err := service.compareRendered(ctx, manifest1, manifest2, false)
	require.NoError(t, err)
	require.NotNil(t, diffResult, "diffResult should not be nil when using internal diff engine")
	require.NotEmpty(t, diffRaw)

	// Convert to structured diff
	structured := service.convertToStructuredDiff(diffResult)
	require.NotNil(t, structured)

	// Verify metadata
	assert.Equal(t, "1.0.0", structured.Metadata.EngineVersion)
	assert.NotEmpty(t, structured.Metadata.CompareID)
	assert.NotEmpty(t, structured.Metadata.GeneratedAt)

	// Verify stats
	require.NotNil(t, structured.Stats)
	assert.Equal(t, 1, structured.Stats.Resources.Modified)
	assert.Greater(t, structured.Stats.Changes.Total, 0)

	// Verify resources
	require.Len(t, structured.Resources, 1)
	resource := structured.Resources[0]

	// Verify resource identity
	assert.Equal(t, "apps/v1", resource.Identity.APIVersion)
	assert.Equal(t, "Deployment", resource.Identity.Kind)
	assert.Equal(t, "api", resource.Identity.Name)
	assert.Equal(t, "production", resource.Identity.Namespace)

	// Verify changes exist
	assert.Greater(t, len(resource.Changes), 0)

	// Verify at least one change has semantic information
	hasSemanticInfo := false
	for _, change := range resource.Changes {
		if change.SemanticType != "" || change.ChangeCategory != "" {
			hasSemanticInfo = true
			// Verify change structure
			assert.NotEmpty(t, change.Op)
			assert.NotEmpty(t, change.Path)
			assert.NotEmpty(t, change.ValueType)
			break
		}
	}
	assert.True(t, hasSemanticInfo, "at least one change should have semantic information")

	// Verify resource summary
	require.NotNil(t, resource.Summary)
	assert.Greater(t, resource.Summary.TotalChanges, 0)
	assert.NotNil(t, resource.Summary.ByImportance)
	assert.NotEmpty(t, resource.Summary.Categories)
}

// TestStructuredDiffForMultipleResources tests structured diff with multiple resource changes
func TestStructuredDiffForMultipleResources(t *testing.T) {
	originalValue := os.Getenv("INTERNAL_DIFF_ENABLED")
	os.Setenv("INTERNAL_DIFF_ENABLED", "true")
	defer os.Setenv("INTERNAL_DIFF_ENABLED", originalValue)

	service := NewHelmService()
	ctx := context.Background()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config1
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config2
data:
  key: value1
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config2
data:
  key: value2
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config3
`

	diffResult, _, err := service.compareRendered(ctx, manifest1, manifest2, false)
	require.NoError(t, err)
	require.NotNil(t, diffResult)

	structured := service.convertToStructuredDiff(diffResult)
	require.NotNil(t, structured)

	// Should have 3 resources: 1 removed, 1 modified, 1 added
	assert.Equal(t, 3, len(structured.Resources))

	// Verify stats
	assert.Equal(t, 1, structured.Stats.Resources.Added)
	assert.Equal(t, 1, structured.Stats.Resources.Removed)
	assert.Equal(t, 1, structured.Stats.Resources.Modified)

	// Find each type of change
	var added, removed, modified *models.ResourceDiff
	for i := range structured.Resources {
		switch structured.Resources[i].ChangeType {
		case "added":
			added = &structured.Resources[i]
		case "removed":
			removed = &structured.Resources[i]
		case "modified":
			modified = &structured.Resources[i]
		}
	}

	require.NotNil(t, added, "should have one added resource")
	require.NotNil(t, removed, "should have one removed resource")
	require.NotNil(t, modified, "should have one modified resource")

	assert.Equal(t, "config3", added.Identity.Name)
	assert.Equal(t, "config1", removed.Identity.Name)
	assert.Equal(t, "config2", modified.Identity.Name)

	// Modified resource should have changes
	assert.Greater(t, len(modified.Changes), 0)
}

// TestStructuredDiffAvailableFlag tests that the structuredDiffAvailable flag is set correctly
func TestStructuredDiffAvailableFlag(t *testing.T) {
	t.Run("flag is true when internal diff engine is enabled", func(t *testing.T) {
		// Ensure internal diff is enabled
		originalValue := os.Getenv("INTERNAL_DIFF_ENABLED")
		os.Setenv("INTERNAL_DIFF_ENABLED", "true")
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

		diffResult, diffRaw, err := service.compareRendered(ctx, manifest1, manifest2, false)
		require.NoError(t, err)
		require.NotNil(t, diffResult)
		require.NotEmpty(t, diffRaw)

		// Simulate what CompareVersions does
		response := &models.CompareResponse{
			Success:  true,
			Diff:     diffRaw,
			Version1: "v1",
			Version2: "v2",
		}

		if diffResult != nil {
			response.StructuredDiff = service.convertToStructuredDiff(diffResult)
			response.StructuredDiffAvailable = true
		} else {
			response.StructuredDiffAvailable = false
		}

		assert.True(t, response.StructuredDiffAvailable, "structuredDiffAvailable should be true when internal diff engine is enabled")
		assert.NotNil(t, response.StructuredDiff, "structuredDiff should not be nil")
	})

	t.Run("flag is false when internal diff engine is disabled", func(t *testing.T) {
		// Disable internal diff engine
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

		diffResult, diffRaw, err := service.compareRendered(ctx, manifest1, manifest2, false)
		require.NoError(t, err)
		require.NotEmpty(t, diffRaw)

		// Simulate what CompareVersions does
		response := &models.CompareResponse{
			Success:  true,
			Diff:     diffRaw,
			Version1: "v1",
			Version2: "v2",
		}

		if diffResult != nil {
			response.StructuredDiff = service.convertToStructuredDiff(diffResult)
			response.StructuredDiffAvailable = true
		} else {
			response.StructuredDiffAvailable = false
		}

		assert.False(t, response.StructuredDiffAvailable, "structuredDiffAvailable should be false when internal diff engine is disabled")
		assert.Nil(t, response.StructuredDiff, "structuredDiff should be nil")
	})
}

