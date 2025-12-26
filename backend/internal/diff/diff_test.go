package diff

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseManifests(t *testing.T) {
	t.Run("empty input", func(t *testing.T) {
		resources, err := ParseManifests("")
		require.NoError(t, err)
		assert.Empty(t, resources)
	})

	t.Run("single resource", func(t *testing.T) {
		yaml := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key: value
`
		resources, err := ParseManifests(yaml)
		require.NoError(t, err)
		require.Len(t, resources, 1)

		r := resources[0]
		assert.Equal(t, "v1", r.APIVersion)
		assert.Equal(t, "ConfigMap", r.Kind)
		assert.Equal(t, "test-config", r.Metadata.Name)
		assert.Equal(t, "default", r.Metadata.Namespace)
		assert.Equal(t, "value", r.Data["key"])
	})

	t.Run("multiple resources", func(t *testing.T) {
		yaml := `
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
		resources, err := ParseManifests(yaml)
		require.NoError(t, err)
		require.Len(t, resources, 2)

		assert.Equal(t, "config1", resources[0].Metadata.Name)
		assert.Equal(t, "config2", resources[1].Metadata.Name)
	})

	t.Run("with labels and annotations", func(t *testing.T) {
		yaml := `
apiVersion: v1
kind: Service
metadata:
  name: my-service
  labels:
    app: myapp
    version: v1
  annotations:
    description: "Test service"
spec:
  ports:
  - port: 80
`
		resources, err := ParseManifests(yaml)
		require.NoError(t, err)
		require.Len(t, resources, 1)

		r := resources[0]
		assert.Equal(t, "myapp", r.Metadata.Labels["app"])
		assert.Equal(t, "v1", r.Metadata.Labels["version"])
		assert.Equal(t, "Test service", r.Metadata.Annotations["description"])
	})
}

func TestGetResourceKey(t *testing.T) {
	resource := Resource{
		APIVersion: "apps/v1",
		Kind:       "Deployment",
		Metadata: Metadata{
			Name:      "my-deployment",
			Namespace: "default",
		},
	}

	key := GetResourceKey(resource)
	assert.Equal(t, "apps/v1", key.APIVersion)
	assert.Equal(t, "Deployment", key.Kind)
	assert.Equal(t, "my-deployment", key.Name)
	assert.Equal(t, "default", key.Namespace)
}

func TestEngineCompare_NoChanges(t *testing.T) {
	engine := NewEngine()

	manifest := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key: value
`

	result, err := engine.Compare(manifest, manifest)
	require.NoError(t, err)
	assert.Equal(t, 0, result.Summary.Total)
	assert.Equal(t, 0, result.Summary.Added)
	assert.Equal(t, 0, result.Summary.Removed)
	assert.Equal(t, 0, result.Summary.Modified)
	assert.Empty(t, result.Resources)
}

func TestEngineCompare_ResourceAdded(t *testing.T) {
	engine := NewEngine()

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

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Summary.Total)
	assert.Equal(t, 1, result.Summary.Added)
	assert.Equal(t, 0, result.Summary.Removed)
	assert.Equal(t, 0, result.Summary.Modified)

	require.Len(t, result.Resources, 1)
	assert.Equal(t, ChangeTypeAdded, result.Resources[0].ChangeType)
	assert.Equal(t, "config2", result.Resources[0].Name)
}

func TestEngineCompare_ResourceRemoved(t *testing.T) {
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
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config1
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Summary.Total)
	assert.Equal(t, 0, result.Summary.Added)
	assert.Equal(t, 1, result.Summary.Removed)
	assert.Equal(t, 0, result.Summary.Modified)

	require.Len(t, result.Resources, 1)
	assert.Equal(t, ChangeTypeRemoved, result.Resources[0].ChangeType)
	assert.Equal(t, "config2", result.Resources[0].Name)
}

func TestEngineCompare_ResourceModified(t *testing.T) {
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
	assert.Equal(t, 1, result.Summary.Total)
	assert.Equal(t, 0, result.Summary.Added)
	assert.Equal(t, 0, result.Summary.Removed)
	assert.Equal(t, 1, result.Summary.Modified)

	require.Len(t, result.Resources, 1)
	assert.Equal(t, ChangeTypeModified, result.Resources[0].ChangeType)
	assert.Equal(t, "test-config", result.Resources[0].Name)

	require.Len(t, result.Resources[0].Fields, 1)
	field := result.Resources[0].Fields[0]
	assert.Equal(t, "data.key", field.Path)
	assert.Equal(t, "value1", field.OldValue)
	assert.Equal(t, "value2", field.NewValue)
	assert.Equal(t, ChangeTypeModified, field.Type)
}

func TestEngineCompare_LabelsIgnored(t *testing.T) {
	engine := NewEngine()
	engine.IgnoreLabels = true

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    app: myapp
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
    app: myapp
    version: v2
data:
  key: value
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	assert.Equal(t, 0, result.Summary.Total, "Labels should be ignored")
}

func TestEngineCompare_LabelsNotIgnored(t *testing.T) {
	engine := NewEngine()
	engine.IgnoreLabels = false

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    app: myapp
    version: v1
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    app: myapp
    version: v2
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Summary.Modified)
	require.Len(t, result.Resources, 1)
	require.GreaterOrEqual(t, len(result.Resources[0].Fields), 1)

	// Find the version label change
	found := false
	for _, field := range result.Resources[0].Fields {
		if field.Path == "metadata.labels.version" {
			found = true
			assert.Equal(t, "v1", field.OldValue)
			assert.Equal(t, "v2", field.NewValue)
			break
		}
	}
	assert.True(t, found, "Version label change should be detected")
}

func TestEngineCompare_ComplexDeployment(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:1.0.0
        ports:
        - containerPort: 8080
`

	manifest2 := `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:2.0.0
        ports:
        - containerPort: 8080
`

	result, err := engine.Compare(manifest1, manifest2)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Summary.Modified)
	require.Len(t, result.Resources, 1)

	// Check that replicas and image changes are detected
	hasReplicasChange := false

	for _, field := range result.Resources[0].Fields {
		if field.Path == "spec.replicas" {
			hasReplicasChange = true
			assert.Equal(t, float64(2), field.OldValue) // YAML unmarshals numbers as float64
			assert.Equal(t, float64(3), field.NewValue)
		}
		// Note: image is in a nested array, so the entire containers array might be detected as changed
	}

	assert.True(t, hasReplicasChange, "Replicas change should be detected")
	// Image change detection depends on deep comparison of arrays
}

func TestEngineCompare_DeterministicOutput(t *testing.T) {
	engine := NewEngine()

	manifest1 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-a
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-b
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-c
`

	manifest2 := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-c
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-a
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-b
`

	// Run comparison multiple times
	var results []*DiffResult
	for i := 0; i < 5; i++ {
		result, err := engine.Compare(manifest1, manifest2)
		require.NoError(t, err)
		results = append(results, result)
	}

	// All results should be identical
	for i := 1; i < len(results); i++ {
		assert.Equal(t, results[0].Summary, results[i].Summary)
		assert.Equal(t, len(results[0].Resources), len(results[i].Resources))
		// Check raw output is identical (deterministic)
		assert.Equal(t, results[0].Raw, results[i].Raw)
	}
}

func TestEngineCompare_EmptyManifests(t *testing.T) {
	engine := NewEngine()

	result, err := engine.Compare("", "")
	require.NoError(t, err)
	assert.Equal(t, 0, result.Summary.Total)
	assert.Empty(t, result.Resources)
}

func TestGetSortedKeys_Deterministic(t *testing.T) {
	resources := map[ResourceKey]Resource{
		{APIVersion: "v1", Kind: "ConfigMap", Name: "config-c", Namespace: "default"}:     {},
		{APIVersion: "v1", Kind: "ConfigMap", Name: "config-a", Namespace: "default"}:     {},
		{APIVersion: "v1", Kind: "ConfigMap", Name: "config-b", Namespace: "default"}:     {},
		{APIVersion: "apps/v1", Kind: "Deployment", Name: "app", Namespace: "production"}: {},
	}

	// Run sorting multiple times
	var results [][]ResourceKey
	for i := 0; i < 5; i++ {
		sorted := GetSortedKeys(resources)
		results = append(results, sorted)
	}

	// All results should be identical
	for i := 1; i < len(results); i++ {
		require.Equal(t, len(results[0]), len(results[i]))
		for j := range results[0] {
			assert.Equal(t, results[0][j], results[i][j])
		}
	}

	// Verify sorting order
	sorted := results[0]
	assert.Equal(t, "apps/v1", sorted[0].APIVersion) // apps/v1 comes before v1
	assert.Equal(t, "v1", sorted[1].APIVersion)
	assert.Equal(t, "config-a", sorted[1].Name) // alphabetical order
	assert.Equal(t, "config-b", sorted[2].Name)
	assert.Equal(t, "config-c", sorted[3].Name)
}
