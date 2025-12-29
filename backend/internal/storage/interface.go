package storage

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/dcotelo/chartimpact/backend/internal/models"
)

// ComparisonStore defines the interface for storing and retrieving comparison results
type ComparisonStore interface {
	// Save stores a new comparison result
	Save(ctx context.Context, req *SaveComparisonRequest) (*StoredComparison, error)

	// GetByID retrieves a comparison by its UUID
	GetByID(ctx context.Context, compareID uuid.UUID) (*StoredComparison, error)

	// GetByHash retrieves a comparison by content hash (for deduplication)
	GetByHash(ctx context.Context, contentHash string) (*StoredComparison, error)

	// List retrieves recent comparisons with filters
	List(ctx context.Context, filters *ListFilters) ([]*ComparisonSummary, error)

	// GetAnalytics retrieves aggregate statistics
	GetAnalytics(ctx context.Context, filters *AnalyticsFilters) (*AnalyticsResult, error)

	// DeleteExpired removes comparisons past their TTL
	DeleteExpired(ctx context.Context) (int64, error)

	// UpdateLastAccessed updates the last access timestamp
	UpdateLastAccessed(ctx context.Context, compareID uuid.UUID) error

	// Close closes the storage connection
	Close() error
}

// SaveComparisonRequest represents a request to save a comparison
type SaveComparisonRequest struct {
	CompareID      uuid.UUID
	ContentHash    string
	Repository     string
	ChartPath      string
	Version1       string
	Version2       string
	ValuesFile     *string
	ValuesSHA256   *string
	StructuredDiff *models.StructuredDiffResult
	EngineVersion  string
	HelmVersion    string
	RetentionDays  int // Default: 30
}

// StoredComparison represents a comparison retrieved from storage
type StoredComparison struct {
	ID                 int64
	CompareID          uuid.UUID
	ContentHash        string
	Repository         string
	ChartPath          string
	Version1           string
	Version2           string
	ValuesFile         *string
	ValuesSHA256       *string
	StructuredDiff     *models.StructuredDiffResult
	EngineVersion      string
	HelmVersion        string
	UncompressedSize   int
	CompressionFormat  string
	CreatedAt          time.Time
	ExpiresAt          time.Time
	LastAccessedAt     *time.Time
	Deduplicated       bool // Set to true if this was fetched via hash match
}

// ComparisonSummary represents a lightweight comparison for listing
type ComparisonSummary struct {
	CompareID        uuid.UUID
	Repository       string
	ChartPath        string
	Version1         string
	Version2         string
	ResourcesAdded   int
	ResourcesModified int
	ResourcesRemoved int
	TotalChanges     int
	UncompressedSize int
	CreatedAt        time.Time
	ExpiresAt        time.Time
}

// ListFilters defines filters for listing comparisons
type ListFilters struct {
	Repository   *string
	ChartPath    *string
	Since        *time.Time
	Until        *time.Time
	MinChanges   *int
	HasChanges   *bool
	Limit        int
	Offset       int
	OrderBy      string // "created_at", "total_changes", etc.
	OrderDir     string // "asc", "desc"
}

// AnalyticsFilters defines filters for analytics queries
type AnalyticsFilters struct {
	Since        *time.Time
	Until        *time.Time
	Repository   *string
	Limit        int
}

// AnalyticsResult represents aggregate analytics data
type AnalyticsResult struct {
	PopularCharts     []*ChartPopularity
	BreakingChanges   []*BreakingChangeStats
	DeploymentRisks   *RiskDistribution
	TotalComparisons  int64
	PeriodStart       time.Time
	PeriodEnd         time.Time
}

// ChartPopularity represents popularity statistics for a chart
type ChartPopularity struct {
	Repository       string
	ChartPath        string
	ComparisonCount  int
	WithChanges      int
	AvgModified      float64
	LastComparisonAt time.Time
}

// BreakingChangeStats represents statistics for charts with breaking changes
type BreakingChangeStats struct {
	Repository      string
	ChartPath       string
	HighRiskCount   int
	MediumRiskCount int
	TotalChanges    int
	LastSeenAt      time.Time
}

// RiskDistribution represents the distribution of risk levels
type RiskDistribution struct {
	HighRisk   int
	MediumRisk int
	LowRisk    int
	NoChanges  int
}

// ReplayMetadata contains metadata about a stored comparison
type ReplayMetadata struct {
	StoredAt         time.Time
	ExpiresAt        time.Time
	IsExpired        bool
	IsDeduplicated   bool
	AccessCount      int
	UncompressedSize int
	CompressionRatio float64
}
