package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCompareRequest(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		req := CompareRequest{
			Repository: "https://github.com/example/repo.git",
			ChartPath:  "charts/mychart",
			Version1:   "v1.0.0",
			Version2:   "v2.0.0",
		}

		data, err := json.Marshal(req)
		require.NoError(t, err)

		var decoded CompareRequest
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.Equal(t, req.Repository, decoded.Repository)
		assert.Equal(t, req.ChartPath, decoded.ChartPath)
		assert.Equal(t, req.Version1, decoded.Version1)
		assert.Equal(t, req.Version2, decoded.Version2)
	})

	t.Run("handles optional fields", func(t *testing.T) {
		valuesFile := "values.yaml"
		valuesContent := "key: value"
		contextLines := 5
		suppressRegex := "secret"

		req := CompareRequest{
			Repository:     "https://github.com/example/repo.git",
			ChartPath:      "charts/mychart",
			Version1:       "v1.0.0",
			Version2:       "v2.0.0",
			ValuesFile:     &valuesFile,
			ValuesContent:  &valuesContent,
			IgnoreLabels:   true,
			SecretHandling: "suppress",
			ContextLines:   &contextLines,
			SuppressKinds:  []string{"Secret", "ConfigMap"},
			SuppressRegex:  &suppressRegex,
		}

		data, err := json.Marshal(req)
		require.NoError(t, err)

		var decoded CompareRequest
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.Equal(t, valuesFile, *decoded.ValuesFile)
		assert.Equal(t, valuesContent, *decoded.ValuesContent)
		assert.True(t, decoded.IgnoreLabels)
		assert.Equal(t, "suppress", decoded.SecretHandling)
		assert.Equal(t, contextLines, *decoded.ContextLines)
		assert.Len(t, decoded.SuppressKinds, 2)
		assert.Equal(t, suppressRegex, *decoded.SuppressRegex)
	})
}

func TestCompareResponse(t *testing.T) {
	t.Run("marshals successful response", func(t *testing.T) {
		resp := CompareResponse{
			Success:  true,
			Diff:     "--- version1\n+++ version2\n@@ -1,1 +1,1 @@",
			Version1: "v1.0.0",
			Version2: "v2.0.0",
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded CompareResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.True(t, decoded.Success)
		assert.NotEmpty(t, decoded.Diff)
		assert.Equal(t, "v1.0.0", decoded.Version1)
		assert.Equal(t, "v2.0.0", decoded.Version2)
	})

	t.Run("marshals error response", func(t *testing.T) {
		resp := CompareResponse{
			Success: false,
			Error:   "Failed to clone repository",
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded CompareResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.False(t, decoded.Success)
		assert.NotEmpty(t, decoded.Error)
	})

	t.Run("marshals response with structured diff available", func(t *testing.T) {
		resp := CompareResponse{
			Success:  true,
			Diff:     "--- version1\n+++ version2\n",
			Version1: "v1.0.0",
			Version2: "v2.0.0",
			StructuredDiff: &StructuredDiffResult{
				Metadata: DiffMetadata{
					EngineVersion: "1.0.0",
					CompareID:     "test-123",
					GeneratedAt:   "2024-01-01T00:00:00Z",
					Inputs: InputMetadata{
						Left:  SourceMetadata{Source: "helm", Chart: "test", Version: "v1.0.0"},
						Right: SourceMetadata{Source: "helm", Chart: "test", Version: "v2.0.0"},
					},
				},
				Resources: []ResourceDiff{},
				Stats: &DiffStats{
					Resources: DiffStatsResources{Added: 0, Removed: 0, Modified: 0},
					Changes:   DiffStatsChanges{Total: 0},
				},
			},
			StructuredDiffAvailable: true,
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded CompareResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.True(t, decoded.Success)
		assert.True(t, decoded.StructuredDiffAvailable)
		assert.NotNil(t, decoded.StructuredDiff)
		assert.Equal(t, "1.0.0", decoded.StructuredDiff.Metadata.EngineVersion)
	})

	t.Run("marshals response without structured diff", func(t *testing.T) {
		resp := CompareResponse{
			Success:                 true,
			Diff:                    "--- version1\n+++ version2\n",
			Version1:                "v1.0.0",
			Version2:                "v2.0.0",
			StructuredDiffAvailable: false,
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded CompareResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.True(t, decoded.Success)
		assert.False(t, decoded.StructuredDiffAvailable)
		assert.Nil(t, decoded.StructuredDiff)
	})
}

func TestVersionsRequest(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		req := VersionsRequest{
			Repository: "https://github.com/example/repo.git",
		}

		data, err := json.Marshal(req)
		require.NoError(t, err)

		var decoded VersionsRequest
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.Equal(t, req.Repository, decoded.Repository)
	})
}

func TestVersionsResponse(t *testing.T) {
	t.Run("marshals successful response with versions", func(t *testing.T) {
		resp := VersionsResponse{
			Success:  true,
			Tags:     []string{"v1.0.0", "v1.1.0", "v2.0.0"},
			Branches: []string{"main", "develop", "feature/new-feature"},
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded VersionsResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.True(t, decoded.Success)
		assert.Len(t, decoded.Tags, 3)
		assert.Len(t, decoded.Branches, 3)
		assert.Contains(t, decoded.Tags, "v1.0.0")
		assert.Contains(t, decoded.Branches, "main")
	})

	t.Run("marshals error response", func(t *testing.T) {
		resp := VersionsResponse{
			Success: false,
			Error:   "Repository not found",
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded VersionsResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.False(t, decoded.Success)
		assert.NotEmpty(t, decoded.Error)
	})
}

func TestHealthResponse(t *testing.T) {
	t.Run("marshals health response", func(t *testing.T) {
		resp := HealthResponse{
			Status:  "ok",
			Version: "1.0.0",
			HelmOK:  true,
			GitOK:   true,
			DyffOK:  false,
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var decoded HealthResponse
		err = json.Unmarshal(data, &decoded)
		require.NoError(t, err)

		assert.Equal(t, "ok", decoded.Status)
		assert.Equal(t, "1.0.0", decoded.Version)
		assert.True(t, decoded.HelmOK)
		assert.True(t, decoded.GitOK)
		assert.False(t, decoded.DyffOK)
	})
}
