package diff

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDiffResultV1Metadata tests the v1 metadata structure
func TestDiffResultV1Metadata(t *testing.T) {
	engine := NewEngine()

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

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)

	// Verify metadata structure
	assert.Equal(t, "1.0.0", result.Metadata.EngineVersion)
	assert.NotEmpty(t, result.Metadata.CompareID)
	assert.NotEmpty(t, result.Metadata.GeneratedAt)
	
	// Verify inputs metadata
	assert.Equal(t, "helm", result.Metadata.Inputs.Left.Source)
	assert.Equal(t, "helm", result.Metadata.Inputs.Right.Source)
	
	// Verify normalization rules
	assert.Contains(t, result.Metadata.NormalizationRules, "normalizeDefaults")
}

// TestResourceIdentity tests the canonical resource identity structure
func TestResourceIdentity(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 2
`

	manifest2 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	require.Len(t, result.Resources, 1)

	resource := result.Resources[0]
	
	// Verify identity structure
	assert.Equal(t, "apps/v1", resource.Identity.APIVersion)
	assert.Equal(t, "Deployment", resource.Identity.Kind)
	assert.Equal(t, "my-app", resource.Identity.Name)
	assert.Equal(t, "production", resource.Identity.Namespace)
	assert.Nil(t, resource.Identity.UID)
	
	// Verify legacy fields still present
	assert.Equal(t, "apps/v1", resource.APIVersion)
	assert.Equal(t, "Deployment", resource.Kind)
	assert.Equal(t, "my-app", resource.Name)
	assert.Equal(t, "production", resource.Namespace)
}

// TestChangeModelWithSemantics tests the comprehensive change model
func TestChangeModelWithSemantics(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: app
        image: api:v1.0.0
        resources:
          limits:
            cpu: 500m
            memory: 256Mi
`

	manifest2 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: api:v2.0.0
        resources:
          limits:
            cpu: 1
            memory: 512Mi
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	require.Len(t, result.Resources, 1)

	resource := result.Resources[0]
	require.Greater(t, len(resource.Changes), 0)

	// Find the replicas change
	var replicasChange *Change
	for i := range resource.Changes {
		if resource.Changes[i].Path == "spec.replicas" {
			replicasChange = &resource.Changes[i]
			break
		}
	}
	
	require.NotNil(t, replicasChange, "replicas change should be present")
	
	// Verify change structure
	assert.Equal(t, OpReplace, replicasChange.Op)
	assert.Equal(t, "spec.replicas", replicasChange.Path)
	assert.Equal(t, float64(2), replicasChange.Before)
	assert.Equal(t, float64(3), replicasChange.After)
	assert.Equal(t, "number", replicasChange.ValueType)
	assert.Equal(t, "workload.replicas", replicasChange.SemanticType)
	assert.Equal(t, "workload", replicasChange.ChangeCategory)
	assert.Equal(t, "high", replicasChange.Importance)
	assert.Contains(t, replicasChange.Flags, "scaling-change")
	assert.Contains(t, replicasChange.Flags, "runtime-impact")
}

// TestPathTokens tests the typed path token structure
func TestPathTokens(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key: value1
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key: value2
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	require.Len(t, result.Resources, 1)
	require.Greater(t, len(result.Resources[0].Changes), 0)

	change := result.Resources[0].Changes[0]
	
	// Verify path tokens
	assert.Equal(t, "data.key", change.Path)
	require.Len(t, change.PathTokens, 2)
	assert.Equal(t, "data", change.PathTokens[0])
	assert.Equal(t, "key", change.PathTokens[1])
}

// TestResourceSummary tests the derived resource summary
func TestResourceSummary(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels:
    version: v1
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
  labels:
    version: v2
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: api:v2.0.0
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	require.Len(t, result.Resources, 1)

	resource := result.Resources[0]
	require.NotNil(t, resource.Summary)
	
	// Verify summary structure
	assert.Greater(t, resource.Summary.TotalChanges, 0)
	assert.NotNil(t, resource.Summary.ByImportance)
	assert.Greater(t, len(resource.Summary.Categories), 0)
	
	// Categories should be sorted
	if len(resource.Summary.Categories) > 1 {
		for i := 1; i < len(resource.Summary.Categories); i++ {
			assert.LessOrEqual(t, resource.Summary.Categories[i-1], resource.Summary.Categories[i])
		}
	}
}

// TestStatsBlock tests the top-level stats structure
func TestStatsBlock(t *testing.T) {
	engine := NewEngine()

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

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)

	// Verify stats structure
	require.NotNil(t, result.Stats)
	assert.Equal(t, 1, result.Stats.Resources.Removed)  // config1
	assert.Equal(t, 1, result.Stats.Resources.Added)    // config3
	assert.Equal(t, 1, result.Stats.Resources.Modified) // config2
	assert.Greater(t, result.Stats.Changes.Total, 0)
}

// TestDeterministicOutput verifies that the output is deterministic
func TestDeterministicOutput(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key1: value1
  key2: value2
  key3: value3
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key1: changed1
  key2: changed2
  key3: changed3
`

	// Run comparison multiple times
	var results []*DiffResult
	for i := 0; i < 5; i++ {
		result, err := engine.Compare(manifest1, manifest2)
		require.NoError(t, err)
		results = append(results, result)
	}

	// Marshal first result to JSON
	firstJSON, err := json.Marshal(results[0])
	require.NoError(t, err)

	// All results should produce identical JSON
	for i := 1; i < len(results); i++ {
		currentJSON, err := json.Marshal(results[i])
		require.NoError(t, err)
		
		// Compare only structure, not compareId and generatedAt
		var first, current map[string]interface{}
		require.NoError(t, json.Unmarshal(firstJSON, &first))
		require.NoError(t, json.Unmarshal(currentJSON, &current))
		
		// Remove non-deterministic fields
		delete(first["metadata"].(map[string]interface{}), "compareId")
		delete(first["metadata"].(map[string]interface{}), "generatedAt")
		delete(current["metadata"].(map[string]interface{}), "compareId")
		delete(current["metadata"].(map[string]interface{}), "generatedAt")
		
		firstClean, _ := json.Marshal(first)
		currentClean, _ := json.Marshal(current)
		
		assert.JSONEq(t, string(firstClean), string(currentClean))
	}
}

// TestBackwardCompatibility ensures legacy fields are still present
func TestBackwardCompatibility(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key: value1
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key: value2
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)

	// Verify legacy Summary field exists
	assert.NotNil(t, result.Summary)
	assert.Equal(t, 1, result.Summary.Modified)
	assert.Equal(t, 1, result.Summary.Total)

	// Verify legacy ResourceDiff fields
	require.Len(t, result.Resources, 1)
	resource := result.Resources[0]
	
	assert.NotEmpty(t, resource.APIVersion)
	assert.NotEmpty(t, resource.Kind)
	assert.NotEmpty(t, resource.Name)
	assert.NotEmpty(t, resource.Fields)
	
	// Verify Fields match Changes
	assert.Equal(t, len(resource.Changes), len(resource.Fields))
}

// TestSemanticClassification tests semantic type classification
func TestSemanticClassification(t *testing.T) {
	tests := []struct {
		path           string
		expectedType   string
		expectedCat    string
		expectedImp    string
	}{
		{"spec.template.spec.containers.0.image", "container.image", "workload", "high"},
		{"spec.replicas", "workload.replicas", "workload", "high"},
		{"spec.template.spec.containers.0.resources.limits.cpu", "resources.cpu", "resources", "medium"},
		{"metadata.labels.app", "metadata.label", "metadata", "low"},
		{"metadata.annotations.description", "metadata.annotation", "metadata", "low"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			semType := classifySemanticType(tt.path)
			category := classifyChangeCategory(tt.path)
			importance := determineImportance(tt.path, semType)

			assert.Equal(t, tt.expectedType, semType, "semantic type mismatch")
			assert.Equal(t, tt.expectedCat, category, "category mismatch")
			assert.Equal(t, tt.expectedImp, importance, "importance mismatch")
		})
	}
}

// TestValueTypeDetection tests value type detection
func TestValueTypeDetection(t *testing.T) {
	tests := []struct {
		value        interface{}
		expectedType string
	}{
		{"hello", "string"},
		{123, "integer"},
		{123.45, "number"},
		{true, "boolean"},
		{[]interface{}{1, 2, 3}, "array"},
		{map[string]interface{}{"key": "value"}, "object"},
		{nil, "null"},
	}

	for _, tt := range tests {
		t.Run(tt.expectedType, func(t *testing.T) {
			valueType := getValueType(tt.value)
			assert.Equal(t, tt.expectedType, valueType)
		})
	}
}

// TestResourceHashes tests that resource hashes are computed
func TestResourceHashes(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key: value1
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  key: value2
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	require.Len(t, result.Resources, 1)

	resource := result.Resources[0]
	
	// For modified resources, both hashes should be present
	assert.NotEmpty(t, resource.BeforeHash)
	assert.NotEmpty(t, resource.AfterHash)
	assert.NotEqual(t, resource.BeforeHash, resource.AfterHash)
}

// TestNormalizationRules tests that normalization rules are reported
func TestNormalizationRules(t *testing.T) {
	t.Run("with ignore labels", func(t *testing.T) {
		engine := NewEngine()
		engine.IgnoreLabels = true

		manifest := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
`

		result, err := engine.Compare(manifest, manifest)
		require.NoError(t, err)

		assert.Contains(t, result.Metadata.NormalizationRules, "ignoreLabels")
	})

	t.Run("with ignore annotations", func(t *testing.T) {
		engine := NewEngine()
		engine.IgnoreAnnotations = true

		manifest := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
`

		result, err := engine.Compare(manifest, manifest)
		require.NoError(t, err)

		assert.Contains(t, result.Metadata.NormalizationRules, "ignoreAnnotations")
	})
}
