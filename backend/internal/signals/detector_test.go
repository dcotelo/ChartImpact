package signals

import (
	"testing"
	"time"

	"github.com/dcotelo/chartimpact/backend/internal/diff"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDetectorNewDetector(t *testing.T) {
	detector := NewDetector()
	assert.NotNil(t, detector)
}

func TestDetectorDetectSignalsNilInput(t *testing.T) {
	detector := NewDetector()
	result, err := detector.DetectSignals(nil)
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestDetectorDetectSignalsEmptyDiff(t *testing.T) {
	detector := NewDetector()
	
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "test-123",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: diff.InputMetadata{
				Left: diff.SourceMetadata{
					Source:  "helm",
					Version: "v1.0.0",
				},
				Right: diff.SourceMetadata{
					Source:  "helm",
					Version: "v1.1.0",
				},
			},
		},
		Resources: []diff.ResourceDiff{},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, len(result.Signals))
	assert.Equal(t, 0, result.Summary.Total)
}

func TestDetectorDetectSignalsProbeRemoved(t *testing.T) {
	detector := NewDetector()
	
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "test-456",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: diff.InputMetadata{
				Left:  diff.SourceMetadata{Source: "helm", Version: "v1.0.0"},
				Right: diff.SourceMetadata{Source: "helm", Version: "v1.1.0"},
			},
		},
		Resources: []diff.ResourceDiff{
			{
				Identity: diff.ResourceIdentity{
					APIVersion: "apps/v1",
					Kind:       "Deployment",
					Name:       "test-app",
					Namespace:  "default",
				},
				ChangeType: diff.ChangeTypeModified,
				Changes: []diff.Change{
					{
						Op:             diff.OpRemove,
						Path:           "spec.template.spec.containers[0].readinessProbe",
						PathTokens:     []diff.PathToken{"spec", "template", "spec", "containers", 0, "readinessProbe"},
						Before:         map[string]interface{}{"httpGet": map[string]interface{}{"path": "/health", "port": 8080}},
						After:          nil,
						ValueType:      "object",
						SemanticType:   "",
						ChangeCategory: "",
					},
				},
			},
		},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	
	// Should detect readiness probe removal
	assert.Equal(t, 1, len(result.Signals))
	signal := result.Signals[0]
	
	assert.Equal(t, "availability.probe.readiness", signal.Type)
	assert.Equal(t, CategoryAvailability, signal.Category)
	assert.Equal(t, ImportanceHigh, signal.Importance)
	assert.Equal(t, "Deployment", signal.Resource.Kind)
	assert.Equal(t, "test-app", signal.Resource.Name)
	assert.Equal(t, ChangeTypeRemoved, signal.ChangeType)
	assert.Contains(t, signal.Description, "Readiness probe removed")
	assert.Contains(t, signal.Explanation, "receive traffic")
}

func TestDetectorDetectSignalsReplicaChange(t *testing.T) {
	detector := NewDetector()
	
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "test-789",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: diff.InputMetadata{
				Left:  diff.SourceMetadata{Source: "helm", Version: "v1.0.0"},
				Right: diff.SourceMetadata{Source: "helm", Version: "v1.1.0"},
			},
		},
		Resources: []diff.ResourceDiff{
			{
				Identity: diff.ResourceIdentity{
					APIVersion: "apps/v1",
					Kind:       "Deployment",
					Name:       "web-app",
					Namespace:  "production",
				},
				ChangeType: diff.ChangeTypeModified,
				Changes: []diff.Change{
					{
						Op:             diff.OpReplace,
						Path:           "spec.replicas",
						PathTokens:     []diff.PathToken{"spec", "replicas"},
						Before:         3,
						After:          1,
						ValueType:      "integer",
						SemanticType:   "workload.replicas",
						ChangeCategory: "workload",
					},
				},
			},
		},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	
	// Should detect replica count change
	assert.Equal(t, 1, len(result.Signals))
	signal := result.Signals[0]
	
	assert.Equal(t, "availability.replicas", signal.Type)
	assert.Equal(t, CategoryAvailability, signal.Category)
	assert.Equal(t, ImportanceHigh, signal.Importance)
	assert.Contains(t, signal.Description, "Replica count changed from 3 to 1")
	assert.Contains(t, signal.Explanation, "decreases redundancy")
}

func TestDetectorDetectSignalsSecurityContext(t *testing.T) {
	detector := NewDetector()
	
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "test-sec-1",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: diff.InputMetadata{
				Left:  diff.SourceMetadata{Source: "helm", Version: "v1.0.0"},
				Right: diff.SourceMetadata{Source: "helm", Version: "v1.1.0"},
			},
		},
		Resources: []diff.ResourceDiff{
			{
				Identity: diff.ResourceIdentity{
					APIVersion: "apps/v1",
					Kind:       "Deployment",
					Name:       "privileged-app",
					Namespace:  "kube-system",
				},
				ChangeType: diff.ChangeTypeModified,
				Changes: []diff.Change{
					{
						Op:             diff.OpAdd,
						Path:           "spec.template.spec.containers[0].securityContext.privileged",
						PathTokens:     []diff.PathToken{"spec", "template", "spec", "containers", 0, "securityContext", "privileged"},
						Before:         nil,
						After:          true,
						ValueType:      "boolean",
						SemanticType:   "security.context",
						ChangeCategory: "security",
					},
				},
			},
		},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	
	// Should detect privileged mode enabled
	assert.Equal(t, 1, len(result.Signals))
	signal := result.Signals[0]
	
	assert.Equal(t, "security.context.privileged", signal.Type)
	assert.Equal(t, CategorySecurity, signal.Category)
	assert.Equal(t, ImportanceHigh, signal.Importance)
	assert.Contains(t, signal.Description, "Privileged mode enabled")
	assert.Contains(t, signal.Explanation, "full access to the host")
}

func TestDetectorDetectSignalsServiceExposure(t *testing.T) {
	detector := NewDetector()
	
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "test-svc-1",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: diff.InputMetadata{
				Left:  diff.SourceMetadata{Source: "helm", Version: "v1.0.0"},
				Right: diff.SourceMetadata{Source: "helm", Version: "v1.1.0"},
			},
		},
		Resources: []diff.ResourceDiff{
			{
				Identity: diff.ResourceIdentity{
					APIVersion: "v1",
					Kind:       "Service",
					Name:       "database",
					Namespace:  "production",
				},
				ChangeType: diff.ChangeTypeModified,
				Changes: []diff.Change{
					{
						Op:             diff.OpReplace,
						Path:           "spec.type",
						PathTokens:     []diff.PathToken{"spec", "type"},
						Before:         "ClusterIP",
						After:          "LoadBalancer",
						ValueType:      "string",
						SemanticType:   "service.type",
						ChangeCategory: "networking",
					},
				},
			},
		},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	
	// Should detect service exposure change
	assert.Equal(t, 1, len(result.Signals))
	signal := result.Signals[0]
	
	assert.Equal(t, "security.exposure.type", signal.Type)
	assert.Equal(t, CategorySecurity, signal.Category)
	assert.Equal(t, ImportanceHigh, signal.Importance)
	assert.Contains(t, signal.Description, "Service type changed from ClusterIP to LoadBalancer")
	assert.Contains(t, signal.Explanation, "external traffic")
}

func TestDetectorSummary(t *testing.T) {
	detector := NewDetector()
	
	// Create diff result with multiple signals
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "test-summary-1",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: diff.InputMetadata{
				Left:  diff.SourceMetadata{Source: "helm", Version: "v1.0.0"},
				Right: diff.SourceMetadata{Source: "helm", Version: "v1.1.0"},
			},
		},
		Resources: []diff.ResourceDiff{
			{
				Identity: diff.ResourceIdentity{
					APIVersion: "apps/v1",
					Kind:       "Deployment",
					Name:       "app1",
					Namespace:  "default",
				},
				ChangeType: diff.ChangeTypeModified,
				Changes: []diff.Change{
					{
						Op:         diff.OpRemove,
						Path:       "spec.template.spec.containers[0].readinessProbe",
						PathTokens: []diff.PathToken{"spec", "template", "spec", "containers", 0, "readinessProbe"},
						Before:     map[string]interface{}{"httpGet": map[string]interface{}{}},
						ValueType:  "object",
					},
					{
						Op:         diff.OpReplace,
						Path:       "spec.replicas",
						PathTokens: []diff.PathToken{"spec", "replicas"},
						Before:     3,
						After:      1,
						ValueType:  "integer",
					},
					{
						Op:         diff.OpReplace,
						Path:       "spec.template.spec.containers[0].image",
						PathTokens: []diff.PathToken{"spec", "template", "spec", "containers", 0, "image"},
						Before:     "app:v1.0",
						After:      "app:v1.1",
						ValueType:  "string",
					},
				},
			},
		},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	
	// Should have 3 signals
	assert.Equal(t, 3, result.Summary.Total)
	assert.Equal(t, 3, len(result.Signals))
	
	// Check category counts
	assert.Equal(t, 2, result.Summary.ByCategory[CategoryAvailability])  // probe + replicas
	assert.Equal(t, 1, result.Summary.ByCategory[CategoryOther])          // image
	
	// Check importance counts
	assert.Equal(t, 3, result.Summary.ByImportance[ImportanceHigh])
	
	// Should have top signals (max 5)
	assert.LessOrEqual(t, len(result.Summary.TopSignals), 5)
}

func TestDetectorMetadata(t *testing.T) {
	detector := NewDetector()
	
	diffResult := &diff.DiffResult{
		Metadata: diff.DiffMetadata{
			EngineVersion: "1.0.0",
			CompareID:     "unique-compare-id",
			GeneratedAt:   "2024-01-01T12:00:00Z",
			Inputs: diff.InputMetadata{
				Left: diff.SourceMetadata{
					Source:  "helm",
					Chart:   "my-chart",
					Version: "v1.0.0",
				},
				Right: diff.SourceMetadata{
					Source:  "helm",
					Chart:   "my-chart",
					Version: "v1.1.0",
				},
			},
		},
		Resources: []diff.ResourceDiff{},
	}

	result, err := detector.DetectSignals(diffResult)
	require.NoError(t, err)
	assert.NotNil(t, result)
	
	// Check metadata
	assert.Equal(t, SchemaVersion, result.Metadata.SchemaVersion)
	assert.Equal(t, "unique-compare-id", result.Metadata.CompareID)
	assert.NotEmpty(t, result.Metadata.GeneratedAt)
	assert.Equal(t, "helm", result.Metadata.Inputs.Left.Source)
	assert.Equal(t, "my-chart", result.Metadata.Inputs.Left.Chart)
	assert.Equal(t, "v1.0.0", result.Metadata.Inputs.Left.Version)
	assert.Equal(t, "v1.1.0", result.Metadata.Inputs.Right.Version)
}
