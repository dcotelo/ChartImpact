package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/google/uuid"
	
	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/storage"
)

// Mock storage implementation for testing
type MockStorage struct {
	SaveFunc               func(ctx context.Context, req *storage.SaveComparisonRequest) (*storage.StoredComparison, error)
	GetByIDFunc        func(ctx context.Context, compareID uuid.UUID) (*storage.StoredComparison, error)
	GetByHashFunc          func(ctx context.Context, contentHash string) (*storage.StoredComparison, error)
	ListFunc           func(ctx context.Context, filters *storage.ListFilters) ([]*storage.ComparisonSummary, error)
	GetAnalyticsFunc       func(ctx context.Context, filters *storage.AnalyticsFilters) (*storage.AnalyticsResult, error)
	DeleteExpiredFunc      func(ctx context.Context) (int64, error)
	UpdateLastAccessedFunc func(ctx context.Context, compareID uuid.UUID) error
	CloseFunc              func() error
}

func (m *MockStorage) Save(ctx context.Context, req *storage.SaveComparisonRequest) (*storage.StoredComparison, error) {
	if m.SaveFunc != nil {
		return m.SaveFunc(ctx, req)
	}
	return &storage.StoredComparison{CompareID: uuid.New()}, nil
}

func (m *MockStorage) GetByID(ctx context.Context, compareID uuid.UUID) (*storage.StoredComparison, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, compareID)
	}
	return nil, nil
}

func (m *MockStorage) GetByHash(ctx context.Context, contentHash string) (*storage.StoredComparison, error) {
	if m.GetByHashFunc != nil {
		return m.GetByHashFunc(ctx, contentHash)
	}
	return nil, nil
}

func (m *MockStorage) List(ctx context.Context, filters *storage.ListFilters) ([]*storage.ComparisonSummary, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, filters)
	}
	return []*storage.ComparisonSummary{}, nil
}

func (m *MockStorage) GetAnalytics(ctx context.Context, filters *storage.AnalyticsFilters) (*storage.AnalyticsResult, error) {
	if m.GetAnalyticsFunc != nil {
		return m.GetAnalyticsFunc(ctx, filters)
	}
	return &storage.AnalyticsResult{}, nil
}

func (m *MockStorage) DeleteExpired(ctx context.Context) (int64, error) {
	if m.DeleteExpiredFunc != nil {
		return m.DeleteExpiredFunc(ctx)
	}
	return 0, nil
}

func (m *MockStorage) UpdateLastAccessed(ctx context.Context, compareID uuid.UUID) error {
	if m.UpdateLastAccessedFunc != nil {
		return m.UpdateLastAccessedFunc(ctx, compareID)
	}
	return nil
}

func (m *MockStorage) Close() error {
	if m.CloseFunc != nil {
		return m.CloseFunc()
	}
	return nil
}

func TestGetAnalysisHandler_Success(t *testing.T) {
	testID := uuid.New()
	now := time.Now()
	
	mockStore := &MockStorage{
		GetByIDFunc: func(ctx context.Context, compareID uuid.UUID) (*storage.StoredComparison, error) {
			if compareID != testID {
				t.Errorf("Expected compareID %s, got %s", testID, compareID)
			}
			return &storage.StoredComparison{
				CompareID:      testID,
				Repository:     "https://github.com/test/repo.git",
				ChartPath:      "charts/app",
				Version1:       "1.0.0",
				Version2:       "1.1.0",
				ContentHash:    "abc123",
				UncompressedSize: 1000,
				StructuredDiff: &models.StructuredDiffResult{
					Metadata: models.DiffMetadata{
						CompareID:      testID.String(),
						EngineVersion:  "v1",
						GeneratedAt:    time.Now().Format(time.RFC3339),
					},
					Resources: []models.ResourceDiff{},
					Stats: &models.DiffStats{
						Resources: models.DiffStatsResources{
							Added:    0,
							Removed:  0,
							Modified: 0,
						},
						Changes: models.DiffStatsChanges{
							Total: 0,
						},
					},
				},
				CreatedAt:      time.Now(),
				ExpiresAt:      time.Now().Add(30 * 24 * time.Hour),
				LastAccessedAt: &now,
			}, nil
		},
	}

	req := httptest.NewRequest("GET", "/api/analysis/"+testID.String(), nil)
	rec := httptest.NewRecorder()

	// Setup router to extract path variables
	router := mux.NewRouter()
	router.HandleFunc("/api/analysis/{id}", GetAnalysisHandler(mockStore)).Methods("GET")
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["success"] != true {
		t.Error("Expected success=true")
	}

	if response["comparison"] == nil {
		t.Error("Expected comparison data")
	}

	if response["metadata"] == nil {
		t.Error("Expected metadata")
	}
}

func TestGetAnalysisHandler_NotFound(t *testing.T) {
	testID := uuid.New()
	mockStore := &MockStorage{
		GetByIDFunc: func(ctx context.Context, compareID uuid.UUID) (*storage.StoredComparison, error) {
			return nil, nil // Simulate not found
		},
	}

	req := httptest.NewRequest("GET", "/api/analysis/"+testID.String(), nil)
	rec := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/analysis/{id}", GetAnalysisHandler(mockStore)).Methods("GET")
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", rec.Code)
	}
}

func TestGetAnalysisHandler_InvalidUUID(t *testing.T) {
	mockStore := &MockStorage{}

	req := httptest.NewRequest("GET", "/api/analysis/invalid-uuid", nil)
	rec := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/analysis/{id}", GetAnalysisHandler(mockStore)).Methods("GET")
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", rec.Code)
	}
}

func TestGetAnalysisHandler_ExpirationWarning(t *testing.T) {
	testID := uuid.New()
	now := time.Now()
	
	mockStore := &MockStorage{
		GetByIDFunc: func(ctx context.Context, compareID uuid.UUID) (*storage.StoredComparison, error) {
			return &storage.StoredComparison{
				CompareID:      testID,
				Repository:     "https://github.com/test/repo.git",
				ChartPath:      "charts/app",
				Version1:       "1.0.0",
				Version2:       "1.1.0",
				UncompressedSize: 1000,
				StructuredDiff: &models.StructuredDiffResult{
					Metadata: models.DiffMetadata{
						CompareID:      testID.String(),
						EngineVersion:  "v1",
						GeneratedAt:    time.Now().Format(time.RFC3339),
					},
					Resources: []models.ResourceDiff{},
					Stats: &models.DiffStats{
						Resources: models.DiffStatsResources{},
						Changes: models.DiffStatsChanges{},
					},
				},
				CreatedAt:      time.Now(),
				ExpiresAt:      time.Now().Add(12 * time.Hour), // Expires soon
				LastAccessedAt: &now,
			}, nil
		},
	}

	req := httptest.NewRequest("GET", "/api/analysis/"+testID.String(), nil)
	rec := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/analysis/{id}", GetAnalysisHandler(mockStore)).Methods("GET")
	router.ServeHTTP(rec, req)

	// Check for expiration warning header
	warningHeader := rec.Header().Get("X-Expiration-Warning")
	if warningHeader == "" {
		t.Error("Expected X-Expiration-Warning header for soon-to-expire result")
	}
}

func TestListAnalysisHandler_Success(t *testing.T) {
	mockStore := &MockStorage{
		ListFunc: func(ctx context.Context, filters *storage.ListFilters) ([]*storage.ComparisonSummary, error) {
			return []*storage.ComparisonSummary{
				{
					CompareID:         uuid.New(),
					Repository:        "https://github.com/test/repo.git",
					ChartPath:         "charts/app",
					Version1:          "1.0.0",
					Version2:          "1.1.0",
					CreatedAt:         time.Now(),
					ResourcesModified: 5,
					TotalChanges:      5,
				},
			}, nil
		},
	}

	req := httptest.NewRequest("GET", "/api/analysis", nil)
	rec := httptest.NewRecorder()

	handler := http.HandlerFunc(ListAnalysisHandler(mockStore))
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["success"] != true {
		t.Error("Expected success=true")
	}

	comparisons, ok := response["comparisons"].([]interface{})
	if !ok || len(comparisons) != 1 {
		t.Error("Expected 1 comparison in response")
	}
}

func TestListAnalysisHandler_WithFilters(t *testing.T) {
	testRepo := "https://github.com/test/repo.git"
	testChart := "charts/app"

	mockStore := &MockStorage{
		ListFunc: func(ctx context.Context, filters *storage.ListFilters) ([]*storage.ComparisonSummary, error) {
			// Verify filters are passed correctly
			if filters.Repository != nil && *filters.Repository != testRepo {
				t.Errorf("Expected repository %s, got %s", testRepo, *filters.Repository)
			}
			if filters.ChartPath != nil && *filters.ChartPath != testChart {
				t.Errorf("Expected chartPath %s, got %s", testChart, *filters.ChartPath)
			}
			if filters.Limit != 25 {
				t.Errorf("Expected limit 25, got %d", filters.Limit)
			}
			if filters.Offset != 10 {
				t.Errorf("Expected offset 10, got %d", filters.Offset)
			}
			return []*storage.ComparisonSummary{}, nil
		},
	}

	req := httptest.NewRequest("GET", 
		"/api/analysis?repository=https://github.com/test/repo.git&chartPath=charts/app&limit=25&offset=10", 
		nil)
	rec := httptest.NewRecorder()

	handler := http.HandlerFunc(ListAnalysisHandler(mockStore))
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}
}

func TestPopularChartsHandler_Success(t *testing.T) {
	mockStore := &MockStorage{
		GetAnalyticsFunc: func(ctx context.Context, filters *storage.AnalyticsFilters) (*storage.AnalyticsResult, error) {
			return &storage.AnalyticsResult{
				PopularCharts: []*storage.ChartPopularity{
					{
						Repository:       "https://github.com/test/repo.git",
						ChartPath:        "charts/app",
						ComparisonCount:  42,
						WithChanges:      35,
						AvgModified:      8.5,
						LastComparisonAt: time.Now(),
					},
				},
				TotalComparisons: 100,
				PeriodStart:      time.Now().Add(-90 * 24 * time.Hour),
				PeriodEnd:        time.Now(),
			}, nil
		},
	}

	req := httptest.NewRequest("GET", "/api/analytics/charts/popular", nil)
	rec := httptest.NewRecorder()

	handler := http.HandlerFunc(PopularChartsHandler(mockStore))
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["success"] != true {
		t.Error("Expected success=true")
	}

	charts, ok := response["popularCharts"].([]interface{})
	if !ok || len(charts) != 1 {
		t.Error("Expected 1 chart in response")
	}

	if response["totalComparisons"] == nil {
		t.Error("Expected totalComparisons field")
	}
}

func TestPopularChartsHandler_WithLimit(t *testing.T) {
	mockStore := &MockStorage{
		GetAnalyticsFunc: func(ctx context.Context, filters *storage.AnalyticsFilters) (*storage.AnalyticsResult, error) {
			if filters.Limit != 25 {
				t.Errorf("Expected limit 25, got %d", filters.Limit)
			}
			return &storage.AnalyticsResult{
				PopularCharts:    []*storage.ChartPopularity{},
				TotalComparisons: 0,
			}, nil
		},
	}

	req := httptest.NewRequest("GET", "/api/analytics/charts/popular?limit=25", nil)
	rec := httptest.NewRecorder()

	handler := http.HandlerFunc(PopularChartsHandler(mockStore))
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}
}

func TestHealthHandler_WithStorage(t *testing.T) {
	mockStore := &MockStorage{
		DeleteExpiredFunc: func(ctx context.Context) (int64, error) {
			return 0, nil // Database is healthy
		},
	}

	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()

	handler := http.HandlerFunc(HealthHandler(mockStore))
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["dbOK"] != true {
		t.Errorf("Expected dbOK=true when storage is healthy, got: %v", response["dbOK"])
	}

	if response["status"] != "ok" {
		t.Errorf("Expected status=ok when all checks pass, got: %v", response["status"])
	}
}

func TestHealthHandler_WithoutStorage(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()

	// Pass nil storage
	handler := http.HandlerFunc(HealthHandler(nil))
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Should not have dbOk field when storage is disabled
	if _, exists := response["dbOk"]; exists {
		t.Error("Should not have dbOk field when storage is nil")
	}
}

// Basic test placeholder - handlers are tested via integration tests
func TestHandlersPackage(t *testing.T) {
	t.Log("Handlers package compiles successfully")
}
