package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDiskStore(t *testing.T) {
	t.Run("creates store with valid config", func(t *testing.T) {
		tempDir := t.TempDir()
		config := DiskStoreConfig{
			BaseDir:    tempDir,
			DefaultTTL: 24 * time.Hour,
		}

		store, err := NewDiskStore(config, log.StandardLogger())
		require.NoError(t, err)
		require.NotNil(t, store)

		assert.Equal(t, tempDir, store.baseDir)
		assert.Equal(t, 24*time.Hour, store.defaultTTL)
	})

	t.Run("requires base directory", func(t *testing.T) {
		config := DiskStoreConfig{}
		store, err := NewDiskStore(config, log.StandardLogger())
		assert.Error(t, err)
		assert.Nil(t, store)
	})

	t.Run("creates directory if not exists", func(t *testing.T) {
		tempDir := filepath.Join(t.TempDir(), "subdir")
		config := DiskStoreConfig{
			BaseDir:    tempDir,
			DefaultTTL: 24 * time.Hour,
		}

		store, err := NewDiskStore(config, log.StandardLogger())
		require.NoError(t, err)
		require.NotNil(t, store)

		// Verify directory was created
		info, err := os.Stat(tempDir)
		assert.NoError(t, err)
		assert.True(t, info.IsDir())
	})

	t.Run("uses default TTL if not specified", func(t *testing.T) {
		tempDir := t.TempDir()
		config := DiskStoreConfig{
			BaseDir: tempDir,
		}

		store, err := NewDiskStore(config, log.StandardLogger())
		require.NoError(t, err)
		assert.Equal(t, 30*24*time.Hour, store.defaultTTL)
	})
}

func TestDiskStore_SaveAndGetByHash(t *testing.T) {
	t.Run("save and retrieve by hash", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()
		stored, err := store.Save(ctx, req)
		require.NoError(t, err)
		require.NotNil(t, stored)

		// Retrieve by hash
		retrieved, err := store.GetByHash(ctx, req.ContentHash)
		require.NoError(t, err)
		require.NotNil(t, retrieved)

		assert.Equal(t, req.CompareID, retrieved.CompareID)
		assert.Equal(t, req.Repository, retrieved.Repository)
		assert.Equal(t, req.ChartPath, retrieved.ChartPath)
		assert.Equal(t, req.Version1, retrieved.Version1)
		assert.Equal(t, req.Version2, retrieved.Version2)
	})

	t.Run("returns error for non-existent hash", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		_, err := store.GetByHash(ctx, "nonexistent")
		assert.Error(t, err)
	})

	t.Run("deduplicates identical requests", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()

		// Save first time
		stored1, err := store.Save(ctx, req)
		require.NoError(t, err)
		assert.False(t, stored1.Deduplicated)

		// Save second time with same hash
		req.CompareID = uuid.New() // Different ID, same content
		stored2, err := store.Save(ctx, req)
		require.NoError(t, err)
		assert.True(t, stored2.Deduplicated)

		// Should return original compareId
		assert.Equal(t, stored1.CompareID, stored2.CompareID)
	})
}

func TestDiskStore_GetByID(t *testing.T) {
	t.Run("retrieve by compare ID", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()
		_, err := store.Save(ctx, req)
		require.NoError(t, err)

		// Retrieve by ID
		retrieved, err := store.GetByID(ctx, req.CompareID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)

		assert.Equal(t, req.CompareID, retrieved.CompareID)
		assert.Equal(t, req.Repository, retrieved.Repository)
	})

	t.Run("returns error for non-existent ID", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		_, err := store.GetByID(ctx, uuid.New())
		assert.Error(t, err)
	})
}

func TestDiskStore_Expiration(t *testing.T) {
	t.Run("expires after TTL", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()
		req.RetentionDays = 0 // Will use default TTL

		// Override default TTL for test
		store.defaultTTL = 1 * time.Second

		_, err := store.Save(ctx, req)
		require.NoError(t, err)

		// Should be retrievable immediately
		retrieved, err := store.GetByHash(ctx, req.ContentHash)
		require.NoError(t, err)
		assert.NotNil(t, retrieved)

		// Wait for expiration
		time.Sleep(2 * time.Second)

		// Should be expired and deleted
		_, err = store.GetByHash(ctx, req.ContentHash)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "expired")
	})

	t.Run("respects custom retention days", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()
		req.RetentionDays = 7 // 7 days

		saved, err := store.Save(ctx, req)
		require.NoError(t, err)

		// Check expires at is set correctly
		expectedExpiration := saved.CreatedAt.Add(7 * 24 * time.Hour)
		assert.WithinDuration(t, expectedExpiration, saved.ExpiresAt, 1*time.Second)
	})
}

func TestDiskStore_AtomicWrites(t *testing.T) {
	t.Run("writes are atomic", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()
		_, err := store.Save(ctx, req)
		require.NoError(t, err)

		// Verify no temp files left behind
		files, err := os.ReadDir(store.baseDir)
		require.NoError(t, err)

		for _, file := range files {
			assert.NotContains(t, file.Name(), ".tmp", "temp file should not exist after save")
		}
	})

	t.Run("file is complete and valid JSON", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		req := createTestSaveRequest()
		_, err := store.Save(ctx, req)
		require.NoError(t, err)

		// Read file directly
		filename := filepath.Join(store.baseDir, req.ContentHash+".json")
		data, err := os.ReadFile(filename)
		require.NoError(t, err)

		// Should be valid JSON
		var rf ResultFile
		err = json.Unmarshal(data, &rf)
		assert.NoError(t, err)
		assert.Equal(t, req.Repository, rf.Repository)
	})
}

func TestDiskStore_CleanupOnStartup(t *testing.T) {
	t.Run("removes expired files", func(t *testing.T) {
		// Enable debug logging for this test
		originalLevel := log.GetLevel()
		log.SetLevel(log.DebugLevel)
		defer log.SetLevel(originalLevel)

		store := createTestStore(t)
		ctx := context.Background()

		// Save some results with short TTL
		req1 := createTestSaveRequest()
		req1.RetentionDays = 0 // Use store default
		store.defaultTTL = 1 * time.Second
		_, err := store.Save(ctx, req1)
		require.NoError(t, err)

		req2 := createTestSaveRequest()
		req2.ContentHash = "different-hash-123"
		req2.CompareID = uuid.New()
		req2.RetentionDays = 0 // Use store default
		_, err = store.Save(ctx, req2)
		require.NoError(t, err)

		// Wait for expiration
		time.Sleep(2 * time.Second)

		// Save a fresh result (should not be deleted)
		store.defaultTTL = 24 * time.Hour
		req3 := createTestSaveRequest()
		req3.ContentHash = "fresh-hash-456"
		req3.CompareID = uuid.New()
		req3.RetentionDays = 0 // Use store default
		_, err = store.Save(ctx, req3)
		require.NoError(t, err)

		// Run cleanup
		err = store.CleanupOnStartup(ctx)
		assert.NoError(t, err)

		// Verify expired files are deleted
		files, err := os.ReadDir(store.baseDir)
		require.NoError(t, err)
		assert.Equal(t, 1, len(files), "only fresh result should remain")
	})

	t.Run("removes corrupt files", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Create a corrupt JSON file
		corruptFile := filepath.Join(store.baseDir, "corrupt.json")
		err := os.WriteFile(corruptFile, []byte("{invalid json"), 0644)
		require.NoError(t, err)

		// Run cleanup
		err = store.CleanupOnStartup(ctx)
		assert.NoError(t, err)

		// Verify corrupt file is deleted
		_, err = os.Stat(corruptFile)
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("handles non-existent directory", func(t *testing.T) {
		tempDir := filepath.Join(t.TempDir(), "nonexistent")
		store := &DiskStore{
			baseDir: tempDir,
			logger:  log.StandardLogger(),
		}

		ctx := context.Background()
		err := store.CleanupOnStartup(ctx)
		assert.NoError(t, err) // Should not error
	})

	t.Run("logs cleanup summary", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Save and expire some results
		for i := 0; i < 3; i++ {
			req := createTestSaveRequest()
			req.ContentHash = fmt.Sprintf("hash-%d", i)
			req.CompareID = uuid.New()
			req.RetentionDays = 0 // Use store default
			store.defaultTTL = 1 * time.Second
			_, err := store.Save(ctx, req)
			require.NoError(t, err)
		}

		time.Sleep(2 * time.Second)

		// Run cleanup
		err := store.CleanupOnStartup(ctx)
		assert.NoError(t, err)
	})
}

func TestDiskStore_MaxDiskUsage(t *testing.T) {
	t.Run("enforces max disk usage", func(t *testing.T) {
		store := createTestStore(t)
		// Set a very small limit
		store.maxDiskUsageBytes = 1024 // 1KB
		ctx := context.Background()

		// Save multiple results to exceed limit
		for i := 0; i < 10; i++ {
			req := createTestSaveRequest()
			req.ContentHash = fmt.Sprintf("hash-%d", i)
			req.CompareID = uuid.New()
			_, err := store.Save(ctx, req)
			require.NoError(t, err)
			time.Sleep(10 * time.Millisecond) // Ensure different timestamps
		}

		// Run cleanup
		err := store.CleanupOnStartup(ctx)
		assert.NoError(t, err)

		// Check that some files were deleted
		files, err := os.ReadDir(store.baseDir)
		require.NoError(t, err)
		assert.Less(t, len(files), 10, "some files should have been deleted")
	})

	t.Run("deletes oldest first", func(t *testing.T) {
		store := createTestStore(t)
		store.maxDiskUsageBytes = 2048 // 2KB
		ctx := context.Background()

		// Save results with time spacing
		oldHash := "old-result"
		req1 := createTestSaveRequest()
		req1.ContentHash = oldHash
		_, err := store.Save(ctx, req1)
		require.NoError(t, err)

		time.Sleep(100 * time.Millisecond)

		newHash := "new-result"
		req2 := createTestSaveRequest()
		req2.ContentHash = newHash
		req2.CompareID = uuid.New()
		_, err = store.Save(ctx, req2)
		require.NoError(t, err)

		// Run cleanup with very low limit
		store.maxDiskUsageBytes = 100
		err = store.CleanupOnStartup(ctx)
		assert.NoError(t, err)

		// Verify old result was deleted first
		_, err = os.Stat(filepath.Join(store.baseDir, oldHash+".json"))
		assert.True(t, os.IsNotExist(err) || err != nil)
	})
}

func TestDiskStore_List(t *testing.T) {
	t.Run("lists all results", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Save multiple results
		for i := 0; i < 3; i++ {
			req := createTestSaveRequest()
			req.ContentHash = fmt.Sprintf("hash-%d", i)
			req.CompareID = uuid.New()
			_, err := store.Save(ctx, req)
			require.NoError(t, err)
		}

		// List all
		summaries, err := store.List(ctx, nil)
		require.NoError(t, err)
		assert.Equal(t, 3, len(summaries))
	})

	t.Run("filters by repository", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Save results with different repositories
		req1 := createTestSaveRequest()
		req1.Repository = "https://github.com/repo1"
		req1.ContentHash = "hash-1"
		_, err := store.Save(ctx, req1)
		require.NoError(t, err)

		req2 := createTestSaveRequest()
		req2.Repository = "https://github.com/repo2"
		req2.ContentHash = "hash-2"
		req2.CompareID = uuid.New()
		_, err = store.Save(ctx, req2)
		require.NoError(t, err)

		// Filter by repository
		repo1 := "https://github.com/repo1"
		filters := &ListFilters{Repository: &repo1}
		summaries, err := store.List(ctx, filters)
		require.NoError(t, err)
		assert.Equal(t, 1, len(summaries))
		assert.Equal(t, "https://github.com/repo1", summaries[0].Repository)
	})

	t.Run("applies limit and offset", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Save multiple results
		for i := 0; i < 5; i++ {
			req := createTestSaveRequest()
			req.ContentHash = fmt.Sprintf("hash-%d", i)
			req.CompareID = uuid.New()
			_, err := store.Save(ctx, req)
			require.NoError(t, err)
			time.Sleep(10 * time.Millisecond)
		}

		// List with limit
		filters := &ListFilters{Limit: 2}
		summaries, err := store.List(ctx, filters)
		require.NoError(t, err)
		assert.Equal(t, 2, len(summaries))

		// List with offset
		filters = &ListFilters{Offset: 2, Limit: 2}
		summaries, err = store.List(ctx, filters)
		require.NoError(t, err)
		assert.Equal(t, 2, len(summaries))
	})

	t.Run("excludes expired results", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Save and expire a result
		req1 := createTestSaveRequest()
		req1.RetentionDays = 0 // Use store default
		store.defaultTTL = 1 * time.Second
		_, err := store.Save(ctx, req1)
		require.NoError(t, err)

		time.Sleep(2 * time.Second)

		// Save a fresh result
		store.defaultTTL = 24 * time.Hour
		req2 := createTestSaveRequest()
		req2.ContentHash = "fresh-hash"
		req2.CompareID = uuid.New()
		req2.RetentionDays = 0 // Use store default
		_, err = store.Save(ctx, req2)
		require.NoError(t, err)

		// List should only return fresh result
		summaries, err := store.List(ctx, nil)
		require.NoError(t, err)
		assert.Equal(t, 1, len(summaries))
	})
}

func TestDiskStore_FailureHandling(t *testing.T) {
	t.Run("continues without caching if directory missing", func(t *testing.T) {
		tempDir := filepath.Join(t.TempDir(), "nonexistent")
		store := &DiskStore{
			baseDir:    tempDir,
			defaultTTL: 24 * time.Hour,
			logger:     log.StandardLogger(),
		}

		ctx := context.Background()
		req := createTestSaveRequest()

		// Save should not error, but won't actually cache
		stored, err := store.Save(ctx, req)
		assert.NoError(t, err)
		assert.NotNil(t, stored)
	})

	t.Run("treats corrupt files as cache miss", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		// Create a corrupt file
		corruptHash := "corrupt-hash"
		corruptFile := filepath.Join(store.baseDir, corruptHash+".json")
		err := os.WriteFile(corruptFile, []byte("{invalid"), 0644)
		require.NoError(t, err)

		// Try to retrieve
		_, err = store.GetByHash(ctx, corruptHash)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "corrupt")
	})
}

func TestDiskStore_ConcurrentAccess(t *testing.T) {
	t.Run("handles concurrent saves", func(t *testing.T) {
		store := createTestStore(t)
		ctx := context.Background()

		done := make(chan bool)

		// Start multiple goroutines saving results
		for i := 0; i < 5; i++ {
			go func(idx int) {
				req := createTestSaveRequest()
				req.ContentHash = fmt.Sprintf("concurrent-hash-%d", idx)
				req.CompareID = uuid.New()
				_, err := store.Save(ctx, req)
				assert.NoError(t, err)
				done <- true
			}(i)
		}

		// Wait for all to complete
		for i := 0; i < 5; i++ {
			<-done
		}

		// Verify all files exist
		summaries, err := store.List(ctx, nil)
		require.NoError(t, err)
		assert.Equal(t, 5, len(summaries))
	})
}

func TestDiskStore_Close(t *testing.T) {
	t.Run("close is a no-op", func(t *testing.T) {
		store := createTestStore(t)
		err := store.Close()
		assert.NoError(t, err)
	})
}

// Helper functions

func createTestStore(t *testing.T) *DiskStore {
	tempDir := t.TempDir()
	config := DiskStoreConfig{
		BaseDir:    tempDir,
		DefaultTTL: 24 * time.Hour,
	}

	store, err := NewDiskStore(config, log.StandardLogger())
	require.NoError(t, err)
	return store
}

func createTestSaveRequest() *SaveComparisonRequest {
	return &SaveComparisonRequest{
		CompareID:   uuid.New(),
		ContentHash: "test-hash-" + uuid.New().String()[:8],
		Repository:  "https://github.com/test/repo",
		ChartPath:   "charts/test",
		Version1:    "1.0.0",
		Version2:    "2.0.0",
		StructuredDiff: &models.StructuredDiffResult{
			Metadata: models.DiffMetadata{
				EngineVersion: "v1",
				CompareID:     uuid.New().String(),
				GeneratedAt:   time.Now().Format(time.RFC3339),
			},
			Resources: []models.ResourceDiff{
				{
					Identity: models.ResourceIdentity{
						APIVersion: "v1",
						Kind:       "Deployment",
						Name:       "test-deployment",
					},
					ChangeType: "modified",
				},
			},
			Stats: &models.DiffStats{
				Resources: models.DiffStatsResources{
					Added:    1,
					Modified: 2,
					Removed:  0,
				},
				Changes: models.DiffStatsChanges{
					Total: 5,
				},
			},
		},
		EngineVersion: "v1",
		HelmVersion:   "3.12.0",
		RetentionDays: 30,
	}
}
