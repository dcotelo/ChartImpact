package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

// DiskStore implements ComparisonStore using disk-only ephemeral storage
// No in-memory caching, no background cleanup - only startup cleanup
type DiskStore struct {
	baseDir          string
	defaultTTL       time.Duration
	maxDiskUsageBytes int64 // 0 means no limit
	logger           *log.Logger
}

// DiskStoreConfig contains configuration for disk storage
type DiskStoreConfig struct {
	BaseDir          string        // Directory to store result files
	DefaultTTL       time.Duration // Default TTL for results
	MaxDiskUsageBytes int64        // Maximum disk usage in bytes (0 = no limit)
}

// ResultFile represents the JSON structure stored on disk
type ResultFile struct {
	Key            string                      `json:"key"`
	CreatedAt      time.Time                   `json:"createdAt"`
	ExpiresAt      time.Time                   `json:"expiresAt"`
	EngineVersion  string                      `json:"engineVersion"`
	SchemaVersion  string                      `json:"schemaVersion"`
	Inputs         ResultInputs                `json:"inputs"`
	Result         *models.StructuredDiffResult `json:"result"`
	CompareID      string                      `json:"compareId"`
	Repository     string                      `json:"repository"`
	ChartPath      string                      `json:"chartPath"`
	Version1       string                      `json:"version1"`
	Version2       string                      `json:"version2"`
	ValuesFile     *string                     `json:"valuesFile,omitempty"`
	ValuesSHA256   *string                     `json:"valuesSha256,omitempty"`
	HelmVersion    string                      `json:"helmVersion,omitempty"`
}

// ResultInputs contains the input parameters used to generate the result
type ResultInputs struct {
	Repository   string  `json:"repository"`
	ChartPath    string  `json:"chartPath"`
	Version1     string  `json:"version1"`
	Version2     string  `json:"version2"`
	ValuesFile   *string `json:"valuesFile,omitempty"`
	ValuesSHA256 *string `json:"valuesSha256,omitempty"`
}

// NewDiskStore creates a new disk-based storage instance
func NewDiskStore(config DiskStoreConfig, logger *log.Logger) (*DiskStore, error) {
	if config.BaseDir == "" {
		return nil, fmt.Errorf("base directory is required")
	}

	if config.DefaultTTL <= 0 {
		config.DefaultTTL = 30 * 24 * time.Hour // Default: 30 days
	}

	if logger == nil {
		logger = log.StandardLogger()
	}

	// Create base directory if it doesn't exist
	if err := os.MkdirAll(config.BaseDir, 0755); err != nil {
		logger.Warnf("Failed to create storage directory %s: %v - continuing without caching", config.BaseDir, err)
		// Don't return error - allow application to continue without caching
	}

	store := &DiskStore{
		baseDir:           config.BaseDir,
		defaultTTL:        config.DefaultTTL,
		maxDiskUsageBytes: config.MaxDiskUsageBytes,
		logger:            logger,
	}

	return store, nil
}

// CleanupOnStartup performs one-time cleanup of expired results
// This is the ONLY cleanup mechanism - no background processes
func (ds *DiskStore) CleanupOnStartup(ctx context.Context) error {
	ds.logger.Info("Starting startup cleanup of ephemeral result storage")
	startTime := time.Now()

	// Check if directory exists
	if _, err := os.Stat(ds.baseDir); os.IsNotExist(err) {
		ds.logger.Info("Storage directory does not exist, skipping cleanup")
		return nil
	}

	var filesScanned, filesDeleted int
	var bytesReclaimed int64

	// Scan directory for result files
	files, err := os.ReadDir(ds.baseDir)
	if err != nil {
		ds.logger.Warnf("Failed to read storage directory during cleanup: %v", err)
		return nil // Don't fail startup on cleanup errors
	}

	now := time.Now()

	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
			continue
		}

		filesScanned++
		filePath := filepath.Join(ds.baseDir, file.Name())

		// Try to read and check expiration
		data, err := os.ReadFile(filePath)
		if err != nil {
			ds.logger.Debugf("Failed to read file %s during cleanup: %v", file.Name(), err)
			continue
		}

		var resultFile ResultFile
		if err := json.Unmarshal(data, &resultFile); err != nil {
			// Corrupt file - delete it
			ds.logger.Debugf("Corrupt result file %s, deleting: %v", file.Name(), err)
			if err := os.Remove(filePath); err == nil {
				filesDeleted++
				bytesReclaimed += int64(len(data))
			}
			continue
		}

		// Check if expired
		if resultFile.ExpiresAt.Before(now) {
			if err := os.Remove(filePath); err == nil {
				filesDeleted++
				bytesReclaimed += int64(len(data))
				ds.logger.Debugf("Deleted expired result: %s (expired at %s)", file.Name(), resultFile.ExpiresAt.Format(time.RFC3339))
			} else {
				ds.logger.Debugf("Failed to delete expired file %s: %v", file.Name(), err)
			}
		} else {
			ds.logger.Debugf("Keeping non-expired result: %s (expires at %s, now is %s)", file.Name(), resultFile.ExpiresAt.Format(time.RFC3339), now.Format(time.RFC3339))
		}
	}

	// Enforce max disk usage if configured
	if ds.maxDiskUsageBytes > 0 {
		deleted, reclaimed := ds.enforceMaxDiskUsage()
		filesDeleted += deleted
		bytesReclaimed += reclaimed
	}

	elapsed := time.Since(startTime)
	ds.logger.WithFields(log.Fields{
		"filesScanned":    filesScanned,
		"filesDeleted":    filesDeleted,
		"bytesReclaimed":  bytesReclaimed,
		"elapsedMs":       elapsed.Milliseconds(),
	}).Info("Startup cleanup completed")

	return nil
}

// enforceMaxDiskUsage deletes oldest files until disk usage is under limit
func (ds *DiskStore) enforceMaxDiskUsage() (filesDeleted int, bytesReclaimed int64) {
	files, err := os.ReadDir(ds.baseDir)
	if err != nil {
		return 0, 0
	}

	type fileInfo struct {
		name      string
		createdAt time.Time
		size      int64
	}

	var resultFiles []fileInfo
	var totalSize int64

	// Collect file info
	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
			continue
		}

		filePath := filepath.Join(ds.baseDir, file.Name())
		info, err := file.Info()
		if err != nil {
			continue
		}

		data, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		var resultFile ResultFile
		if err := json.Unmarshal(data, &resultFile); err != nil {
			continue
		}

		resultFiles = append(resultFiles, fileInfo{
			name:      file.Name(),
			createdAt: resultFile.CreatedAt,
			size:      info.Size(),
		})
		totalSize += info.Size()
	}

	// Check if we need to delete files
	if totalSize <= ds.maxDiskUsageBytes {
		return 0, 0
	}

	// Sort by creation time (oldest first)
	sort.Slice(resultFiles, func(i, j int) bool {
		return resultFiles[i].createdAt.Before(resultFiles[j].createdAt)
	})

	// Delete oldest files until under limit
	for _, f := range resultFiles {
		if totalSize <= ds.maxDiskUsageBytes {
			break
		}

		filePath := filepath.Join(ds.baseDir, f.name)
		if err := os.Remove(filePath); err == nil {
			filesDeleted++
			bytesReclaimed += f.size
			totalSize -= f.size
			ds.logger.Debugf("Deleted old result to enforce disk limit: %s", f.name)
		}
	}

	return filesDeleted, bytesReclaimed
}

// Save stores a new comparison result to disk
func (ds *DiskStore) Save(ctx context.Context, req *SaveComparisonRequest) (*StoredComparison, error) {
	if req == nil {
		return nil, fmt.Errorf("save request is required")
	}

	now := time.Now()
	ttl := ds.defaultTTL
	if req.RetentionDays > 0 {
		ttl = time.Duration(req.RetentionDays) * 24 * time.Hour
	}

	// Check if this is a duplicate by hash
	existing, err := ds.GetByHash(ctx, req.ContentHash)
	if err == nil && existing != nil {
		// Return existing result (deduplication)
		hashPrefix := req.ContentHash
		if len(hashPrefix) > 8 {
			hashPrefix = hashPrefix[:8]
		}
		ds.logger.Debugf("Deduplicated result with hash %s", hashPrefix)
		existing.Deduplicated = true
		return existing, nil
	}

	resultFile := ResultFile{
		Key:           req.ContentHash,
		CreatedAt:     now,
		ExpiresAt:     now.Add(ttl),
		EngineVersion: req.EngineVersion,
		SchemaVersion: "v1",
		Inputs: ResultInputs{
			Repository:   req.Repository,
			ChartPath:    req.ChartPath,
			Version1:     req.Version1,
			Version2:     req.Version2,
			ValuesFile:   req.ValuesFile,
			ValuesSHA256: req.ValuesSHA256,
		},
		Result:       req.StructuredDiff,
		CompareID:    req.CompareID.String(),
		Repository:   req.Repository,
		ChartPath:    req.ChartPath,
		Version1:     req.Version1,
		Version2:     req.Version2,
		ValuesFile:   req.ValuesFile,
		ValuesSHA256: req.ValuesSHA256,
		HelmVersion:  req.HelmVersion,
	}

	// Marshal to JSON
	data, err := json.Marshal(resultFile)
	if err != nil {
		ds.logger.Warnf("Failed to marshal result: %v - continuing without caching", err)
		// Return a stored comparison without saving
		return ds.resultFileToStoredComparison(&resultFile), nil
	}

	// Write atomically (temp file + rename)
	if err := ds.writeAtomic(req.ContentHash, data); err != nil {
		ds.logger.Warnf("Failed to write result to disk: %v - continuing without caching", err)
		// Return result even if write failed
		return ds.resultFileToStoredComparison(&resultFile), nil
	}

	hashPrefix := req.ContentHash
	if len(hashPrefix) > 8 {
		hashPrefix = hashPrefix[:8]
	}
	ds.logger.Debugf("Saved result with key %s (compareId: %s)", hashPrefix, req.CompareID)

	return ds.resultFileToStoredComparison(&resultFile), nil
}

// writeAtomic writes data atomically using temp file + rename
func (ds *DiskStore) writeAtomic(key string, data []byte) error {
	// Check if directory exists and is writable
	if _, err := os.Stat(ds.baseDir); os.IsNotExist(err) {
		return fmt.Errorf("storage directory does not exist")
	}

	filename := fmt.Sprintf("%s.json", key)
	finalPath := filepath.Join(ds.baseDir, filename)
	tempPath := filepath.Join(ds.baseDir, fmt.Sprintf(".%s.tmp", key))

	// Write to temp file
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}

	// Atomic rename
	if err := os.Rename(tempPath, finalPath); err != nil {
		os.Remove(tempPath) // Clean up temp file
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	return nil
}

// GetByID retrieves a comparison by its UUID
func (ds *DiskStore) GetByID(ctx context.Context, compareID uuid.UUID) (*StoredComparison, error) {
	// Scan directory to find file with matching compareId
	files, err := os.ReadDir(ds.baseDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read storage directory: %w", err)
	}

	compareIDStr := compareID.String()

	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
			continue
		}

		filePath := filepath.Join(ds.baseDir, file.Name())
		resultFile, err := ds.readResultFile(filePath)
		if err != nil {
			continue
		}

		if resultFile.CompareID == compareIDStr {
			// Check if expired
			if time.Now().After(resultFile.ExpiresAt) {
				// Delete expired file
				os.Remove(filePath)
				return nil, fmt.Errorf("result expired")
			}

			return ds.resultFileToStoredComparison(resultFile), nil
		}
	}

	return nil, fmt.Errorf("comparison not found")
}

// GetByHash retrieves a comparison by content hash (for deduplication)
func (ds *DiskStore) GetByHash(ctx context.Context, contentHash string) (*StoredComparison, error) {
	filename := fmt.Sprintf("%s.json", contentHash)
	filePath := filepath.Join(ds.baseDir, filename)

	resultFile, err := ds.readResultFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("result not found")
		}
		return nil, err
	}

	// Check if expired
	if time.Now().After(resultFile.ExpiresAt) {
		// Delete expired file
		os.Remove(filePath)
		return nil, fmt.Errorf("result expired")
	}

	return ds.resultFileToStoredComparison(resultFile), nil
}

// readResultFile reads and parses a result file
func (ds *DiskStore) readResultFile(filePath string) (*ResultFile, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var resultFile ResultFile
	if err := json.Unmarshal(data, &resultFile); err != nil {
		// Corrupt file - treat as cache miss
		return nil, fmt.Errorf("corrupt result file: %w", err)
	}

	return &resultFile, nil
}

// resultFileToStoredComparison converts a ResultFile to StoredComparison
func (ds *DiskStore) resultFileToStoredComparison(rf *ResultFile) *StoredComparison {
	compareID, _ := uuid.Parse(rf.CompareID)

	return &StoredComparison{
		CompareID:         compareID,
		ContentHash:       rf.Key,
		Repository:        rf.Repository,
		ChartPath:         rf.ChartPath,
		Version1:          rf.Version1,
		Version2:          rf.Version2,
		ValuesFile:        rf.ValuesFile,
		ValuesSHA256:      rf.ValuesSHA256,
		StructuredDiff:    rf.Result,
		EngineVersion:     rf.EngineVersion,
		HelmVersion:       rf.HelmVersion,
		CreatedAt:         rf.CreatedAt,
		ExpiresAt:         rf.ExpiresAt,
		CompressionFormat: "none",
		Deduplicated:      false,
	}
}

// List retrieves recent comparisons with filters
// Note: This is a simple implementation that scans all files
// For production use with many files, consider adding an index
func (ds *DiskStore) List(ctx context.Context, filters *ListFilters) ([]*ComparisonSummary, error) {
	files, err := os.ReadDir(ds.baseDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read storage directory: %w", err)
	}

	var summaries []*ComparisonSummary
	now := time.Now()

	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
			continue
		}

		filePath := filepath.Join(ds.baseDir, file.Name())
		resultFile, err := ds.readResultFile(filePath)
		if err != nil {
			continue
		}

		// Skip expired
		if resultFile.ExpiresAt.Before(now) {
			continue
		}

		// Apply filters
		if filters != nil {
			if filters.Repository != nil && *filters.Repository != resultFile.Repository {
				continue
			}
			if filters.ChartPath != nil && *filters.ChartPath != resultFile.ChartPath {
				continue
			}
			if filters.Since != nil && resultFile.CreatedAt.Before(*filters.Since) {
				continue
			}
			if filters.Until != nil && resultFile.CreatedAt.After(*filters.Until) {
				continue
			}
		}

		compareID, _ := uuid.Parse(resultFile.CompareID)
		summary := &ComparisonSummary{
			CompareID:  compareID,
			Repository: resultFile.Repository,
			ChartPath:  resultFile.ChartPath,
			Version1:   resultFile.Version1,
			Version2:   resultFile.Version2,
			CreatedAt:  resultFile.CreatedAt,
			ExpiresAt:  resultFile.ExpiresAt,
		}

		// Extract stats if available
		if resultFile.Result != nil && resultFile.Result.Stats != nil {
			summary.ResourcesAdded = resultFile.Result.Stats.Resources.Added
			summary.ResourcesModified = resultFile.Result.Stats.Resources.Modified
			summary.ResourcesRemoved = resultFile.Result.Stats.Resources.Removed
			summary.TotalChanges = resultFile.Result.Stats.Changes.Total
		}

		summaries = append(summaries, summary)
	}

	// Apply limit/offset
	if filters != nil {
		// Sort by created_at descending
		sort.Slice(summaries, func(i, j int) bool {
			return summaries[i].CreatedAt.After(summaries[j].CreatedAt)
		})

		if filters.Offset > 0 && filters.Offset < len(summaries) {
			summaries = summaries[filters.Offset:]
		}

		if filters.Limit > 0 && filters.Limit < len(summaries) {
			summaries = summaries[:filters.Limit]
		}
	}

	return summaries, nil
}

// GetAnalytics returns aggregate statistics (not implemented for disk storage)
func (ds *DiskStore) GetAnalytics(ctx context.Context, filters *AnalyticsFilters) (*AnalyticsResult, error) {
	// Analytics not implemented for disk storage
	return nil, fmt.Errorf("analytics not supported in disk-only storage")
}

// DeleteExpired removes comparisons past their TTL
// Note: For disk storage, cleanup is done at startup only
func (ds *DiskStore) DeleteExpired(ctx context.Context) (int64, error) {
	// This is called by cleanup jobs, but disk storage only cleans up at startup
	ds.logger.Debug("DeleteExpired called - disk storage only cleans up at startup")
	return 0, nil
}

// UpdateLastAccessed updates the last access timestamp
// Note: Disk storage does not track access times (stateless)
func (ds *DiskStore) UpdateLastAccessed(ctx context.Context, compareID uuid.UUID) error {
	// Not implemented for disk storage - no TTL extension on access
	return nil
}

// Close closes the storage connection (no-op for disk storage)
func (ds *DiskStore) Close() error {
	ds.logger.Info("Closing disk storage (no-op)")
	return nil
}
