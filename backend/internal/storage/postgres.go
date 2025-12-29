package storage

import (
	"bytes"
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
)

// PostgresStore implements ComparisonStore using PostgreSQL
type PostgresStore struct {
	db     *sqlx.DB
	logger *logrus.Logger
}

// NewPostgresStore creates a new PostgreSQL-backed comparison store
func NewPostgresStore(dataSourceName string, logger *logrus.Logger) (*PostgresStore, error) {
	db, err := sqlx.Connect("postgres", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Set connection pool parameters
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if logger == nil {
		logger = logrus.New()
	}

	logger.Info("Connected to PostgreSQL storage")

	return &PostgresStore{
		db:     db,
		logger: logger,
	}, nil
}

// Save stores a new comparison result
func (s *PostgresStore) Save(ctx context.Context, req *SaveComparisonRequest) (*StoredComparison, error) {
	// Check for existing result by content hash (deduplication)
	existing, err := s.GetByHash(ctx, req.ContentHash)
	if err == nil && existing != nil {
		s.logger.Infof("Deduplication hit for hash %s, returning existing compare_id %s", req.ContentHash, existing.CompareID)
		existing.Deduplicated = true
		return existing, nil
	}

	// Compress the structured diff
	compressed, uncompressedSize, err := compressJSON(req.StructuredDiff)
	if err != nil {
		return nil, fmt.Errorf("failed to compress structured diff: %w", err)
	}

	// Extract metadata and stats as JSONB for queryability
	metadataJSON, err := json.Marshal(req.StructuredDiff.Metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	statsJSON, err := json.Marshal(req.StructuredDiff.Stats)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal stats: %w", err)
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(req.RetentionDays) * 24 * time.Hour)

	// Insert into database
	query := `
		INSERT INTO comparisons (
			compare_id, content_hash, repository, chart_path,
			version1, version2, values_file, values_sha256,
			metadata, stats, full_diff_compressed, compression_format,
			uncompressed_size, engine_version, helm_version, expires_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
		ON CONFLICT (content_hash) DO UPDATE SET
			last_accessed_at = NOW()
		RETURNING id, created_at, expires_at`

	var id int64
	var createdAt, expiresAtResult time.Time

	err = s.db.QueryRowContext(ctx, query,
		req.CompareID,
		req.ContentHash,
		req.Repository,
		req.ChartPath,
		req.Version1,
		req.Version2,
		req.ValuesFile,
		req.ValuesSHA256,
		metadataJSON,
		statsJSON,
		compressed,
		"gzip",
		uncompressedSize,
		req.EngineVersion,
		req.HelmVersion,
		expiresAt,
	).Scan(&id, &createdAt, &expiresAtResult)

	if err != nil {
		return nil, fmt.Errorf("failed to insert comparison: %w", err)
	}

	s.logger.Infof("Stored comparison %s (hash: %s, size: %d -> %d bytes, ratio: %.1f%%)",
		req.CompareID, req.ContentHash[:8], uncompressedSize, len(compressed),
		100.0*float64(len(compressed))/float64(uncompressedSize))

	return &StoredComparison{
		ID:                id,
		CompareID:         req.CompareID,
		ContentHash:       req.ContentHash,
		Repository:        req.Repository,
		ChartPath:         req.ChartPath,
		Version1:          req.Version1,
		Version2:          req.Version2,
		ValuesFile:        req.ValuesFile,
		ValuesSHA256:      req.ValuesSHA256,
		StructuredDiff:    req.StructuredDiff,
		EngineVersion:     req.EngineVersion,
		HelmVersion:       req.HelmVersion,
		UncompressedSize:  uncompressedSize,
		CompressionFormat: "gzip",
		CreatedAt:         createdAt,
		ExpiresAt:         expiresAtResult,
		Deduplicated:      false,
	}, nil
}

// GetByID retrieves a comparison by its UUID
func (s *PostgresStore) GetByID(ctx context.Context, compareID uuid.UUID) (*StoredComparison, error) {
	query := `
		SELECT 
			id, compare_id, content_hash, repository, chart_path,
			version1, version2, values_file, values_sha256,
			full_diff_compressed, compression_format, uncompressed_size,
			engine_version, helm_version, created_at, expires_at, last_accessed_at
		FROM comparisons
		WHERE compare_id = $1`

	var stored struct {
		ID                 int64          `db:"id"`
		CompareID          uuid.UUID      `db:"compare_id"`
		ContentHash        string         `db:"content_hash"`
		Repository         string         `db:"repository"`
		ChartPath          string         `db:"chart_path"`
		Version1           string         `db:"version1"`
		Version2           string         `db:"version2"`
		ValuesFile         sql.NullString `db:"values_file"`
		ValuesSHA256       sql.NullString `db:"values_sha256"`
		FullDiffCompressed []byte         `db:"full_diff_compressed"`
		CompressionFormat  string         `db:"compression_format"`
		UncompressedSize   int            `db:"uncompressed_size"`
		EngineVersion      string         `db:"engine_version"`
		HelmVersion        sql.NullString `db:"helm_version"`
		CreatedAt          time.Time      `db:"created_at"`
		ExpiresAt          time.Time      `db:"expires_at"`
		LastAccessedAt     sql.NullTime   `db:"last_accessed_at"`
	}

	err := s.db.GetContext(ctx, &stored, query, compareID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get comparison: %w", err)
	}

	// Decompress the structured diff
	var structuredDiff models.StructuredDiffResult
	if err := decompressJSON(stored.FullDiffCompressed, &structuredDiff); err != nil {
		return nil, fmt.Errorf("failed to decompress structured diff: %w", err)
	}

	// Update last accessed timestamp (async, don't block)
	go func() {
		updateCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = s.UpdateLastAccessed(updateCtx, compareID)
	}()

	result := &StoredComparison{
		ID:                stored.ID,
		CompareID:         stored.CompareID,
		ContentHash:       stored.ContentHash,
		Repository:        stored.Repository,
		ChartPath:         stored.ChartPath,
		Version1:          stored.Version1,
		Version2:          stored.Version2,
		StructuredDiff:    &structuredDiff,
		EngineVersion:     stored.EngineVersion,
		UncompressedSize:  stored.UncompressedSize,
		CompressionFormat: stored.CompressionFormat,
		CreatedAt:         stored.CreatedAt,
		ExpiresAt:         stored.ExpiresAt,
		Deduplicated:      false,
	}

	if stored.ValuesFile.Valid {
		result.ValuesFile = &stored.ValuesFile.String
	}
	if stored.ValuesSHA256.Valid {
		result.ValuesSHA256 = &stored.ValuesSHA256.String
	}
	if stored.HelmVersion.Valid {
		result.HelmVersion = stored.HelmVersion.String
	}
	if stored.LastAccessedAt.Valid {
		result.LastAccessedAt = &stored.LastAccessedAt.Time
	}

	return result, nil
}

// GetByHash retrieves a comparison by content hash
func (s *PostgresStore) GetByHash(ctx context.Context, contentHash string) (*StoredComparison, error) {
	query := `
		SELECT compare_id
		FROM comparisons
		WHERE content_hash = $1
		AND expires_at > NOW()
		LIMIT 1`

	var compareID uuid.UUID
	err := s.db.GetContext(ctx, &compareID, query, contentHash)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get comparison by hash: %w", err)
	}

	return s.GetByID(ctx, compareID)
}

// List retrieves recent comparisons with filters
func (s *PostgresStore) List(ctx context.Context, filters *ListFilters) ([]*ComparisonSummary, error) {
	if filters == nil {
		filters = &ListFilters{}
	}

	// Set defaults
	if filters.Limit <= 0 {
		filters.Limit = 100
	}
	if filters.OrderBy == "" {
		filters.OrderBy = "created_at"
	}
	if filters.OrderDir == "" {
		filters.OrderDir = "DESC"
	}

	query := `
		SELECT 
			compare_id,
			repository,
			chart_path,
			version1,
			version2,
			(stats->'resources'->>'added')::int as resources_added,
			(stats->'resources'->>'modified')::int as resources_modified,
			(stats->'resources'->>'removed')::int as resources_removed,
			(stats->'changes'->>'total')::int as total_changes,
			uncompressed_size,
			created_at,
			expires_at
		FROM comparisons
		WHERE 1=1`

	args := []interface{}{}
	argPos := 1

	if filters.Repository != nil {
		query += fmt.Sprintf(" AND repository = $%d", argPos)
		args = append(args, *filters.Repository)
		argPos++
	}

	if filters.ChartPath != nil {
		query += fmt.Sprintf(" AND chart_path = $%d", argPos)
		args = append(args, *filters.ChartPath)
		argPos++
	}

	if filters.Since != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argPos)
		args = append(args, *filters.Since)
		argPos++
	}

	if filters.Until != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argPos)
		args = append(args, *filters.Until)
		argPos++
	}

	if filters.MinChanges != nil {
		query += fmt.Sprintf(" AND (stats->'changes'->>'total')::int >= $%d", argPos)
		args = append(args, *filters.MinChanges)
		argPos++
	}

	if filters.HasChanges != nil && *filters.HasChanges {
		query += " AND (stats->'changes'->>'total')::int > 0"
	}

	query += fmt.Sprintf(" ORDER BY %s %s LIMIT $%d OFFSET $%d",
		filters.OrderBy, filters.OrderDir, argPos, argPos+1)
	args = append(args, filters.Limit, filters.Offset)

	var summaries []*ComparisonSummary
	err := s.db.SelectContext(ctx, &summaries, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list comparisons: %w", err)
	}

	return summaries, nil
}

// GetAnalytics retrieves aggregate statistics
func (s *PostgresStore) GetAnalytics(ctx context.Context, filters *AnalyticsFilters) (*AnalyticsResult, error) {
	if filters == nil {
		filters = &AnalyticsFilters{}
	}

	// Set defaults
	if filters.Limit <= 0 {
		filters.Limit = 20
	}

	// Refresh the materialized view first
	_, err := s.db.ExecContext(ctx, "SELECT refresh_comparison_analytics()")
	if err != nil {
		s.logger.Warnf("Failed to refresh analytics view: %v", err)
	}

	result := &AnalyticsResult{
		PeriodStart: time.Now().Add(-90 * 24 * time.Hour),
		PeriodEnd:   time.Now(),
	}

	// Get popular charts
	popularQuery := `
		SELECT 
			repository,
			chart_path,
			comparison_count,
			with_changes,
			avg_modified_resources,
			last_comparison_at
		FROM comparison_analytics
		ORDER BY comparison_count DESC
		LIMIT $1`

	err = s.db.SelectContext(ctx, &result.PopularCharts, popularQuery, filters.Limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get popular charts: %w", err)
	}

	// Get total comparisons
	countQuery := `SELECT COUNT(*) FROM comparisons WHERE created_at > NOW() - INTERVAL '90 days'`
	err = s.db.GetContext(ctx, &result.TotalComparisons, countQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get total comparisons: %w", err)
	}

	return result, nil
}

// DeleteExpired removes comparisons past their TTL
func (s *PostgresStore) DeleteExpired(ctx context.Context) (int64, error) {
	var deleted int64
	err := s.db.GetContext(ctx, &deleted, "SELECT delete_expired_comparisons()")
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired comparisons: %w", err)
	}

	if deleted > 0 {
		s.logger.Infof("Deleted %d expired comparisons", deleted)
	}

	return deleted, nil
}

// UpdateLastAccessed updates the last access timestamp
func (s *PostgresStore) UpdateLastAccessed(ctx context.Context, compareID uuid.UUID) error {
	query := `UPDATE comparisons SET last_accessed_at = NOW() WHERE compare_id = $1`
	_, err := s.db.ExecContext(ctx, query, compareID)
	return err
}

// Close closes the storage connection
func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// Helper: Compress JSON with gzip
func compressJSON(data interface{}) ([]byte, int, error) {
	// Marshal to JSON first to get size
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return nil, 0, err
	}
	uncompressedSize := len(jsonBytes)

	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)

	if _, err := gw.Write(jsonBytes); err != nil {
		gw.Close()
		return nil, 0, err
	}

	if err := gw.Close(); err != nil {
		return nil, 0, err
	}

	return buf.Bytes(), uncompressedSize, nil
}

// Helper: Decompress JSON from gzip
func decompressJSON(compressed []byte, target interface{}) error {
	gr, err := gzip.NewReader(bytes.NewReader(compressed))
	if err != nil {
		return err
	}
	defer gr.Close()

	return json.NewDecoder(gr).Decode(target)
}
