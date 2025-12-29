package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/storage"
)

// GetAnalysisHandler handles GET /api/analysis/{id} requests
// Retrieves a stored comparison result by UUID
func GetAnalysisHandler(store storage.ComparisonStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if store == nil {
			respondJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
				"success": false,
				"error":   "Storage is not enabled",
			})
			return
		}

		// Get ID from URL parameter
		vars := mux.Vars(r)
		idStr := vars["id"]

		// Parse UUID
		compareID, err := uuid.Parse(idStr)
		if err != nil {
			respondJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Invalid comparison ID format",
			})
			return
		}

		// Retrieve from storage
		stored, err := store.GetByID(r.Context(), compareID)
		if err != nil {
			log.Errorf("Failed to retrieve comparison %s: %v", compareID, err)
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error":   "Failed to retrieve comparison",
			})
			return
		}

		if stored == nil {
			respondJSON(w, http.StatusNotFound, map[string]interface{}{
				"success": false,
				"error":   "Comparison not found",
			})
			return
		}

		// Check if expired
		isExpired := stored.ExpiresAt.Before(time.Now())

		// Build response
		response := map[string]interface{}{
			"success": true,
			"comparison": map[string]interface{}{
				"compareId":      stored.CompareID,
				"repository":     stored.Repository,
				"chartPath":      stored.ChartPath,
				"version1":       stored.Version1,
				"version2":       stored.Version2,
				"structuredDiff": stored.StructuredDiff,
				"createdAt":      stored.CreatedAt,
				"expiresAt":      stored.ExpiresAt,
			},
			"metadata": map[string]interface{}{
				"storedAt":         stored.CreatedAt,
				"expiresAt":        stored.ExpiresAt,
				"isExpired":        isExpired,
				"isDeduplicated":   stored.Deduplicated,
				"uncompressedSize": stored.UncompressedSize,
				"compressionRatio": float64(stored.UncompressedSize) / float64(stored.UncompressedSize), // Placeholder
			},
		}

		// Add expiration warning header if close to expiration
		hoursUntilExpiry := time.Until(stored.ExpiresAt).Hours()
		if hoursUntilExpiry < 24 && hoursUntilExpiry > 0 {
			w.Header().Set("X-Expiration-Warning", "This result will expire soon")
		}

		respondJSON(w, http.StatusOK, response)
	}
}

// ListAnalysisHandler handles GET /api/analysis requests
// Lists recent comparisons with optional filters
func ListAnalysisHandler(store storage.ComparisonStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if store == nil {
			respondJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
				"success": false,
				"error":   "Storage is not enabled",
			})
			return
		}

		// Parse query parameters
		query := r.URL.Query()
		filters := &storage.ListFilters{
			Limit:    50,
			Offset:   0,
			OrderBy:  "created_at",
			OrderDir: "DESC",
		}

		// Parse limit
		if limitStr := query.Get("limit"); limitStr != "" {
			var limit int
			if _, err := fmt.Sscanf(limitStr, "%d", &limit); err == nil && limit > 0 {
				filters.Limit = limit
			}
		}

		// Parse offset
		if offsetStr := query.Get("offset"); offsetStr != "" {
			var offset int
			if _, err := fmt.Sscanf(offsetStr, "%d", &offset); err == nil && offset >= 0 {
				filters.Offset = offset
			}
		}

		// Parse repository filter
		if repo := query.Get("repository"); repo != "" {
			filters.Repository = &repo
		}

		// Parse chart path filter
		if chartPath := query.Get("chartPath"); chartPath != "" {
			filters.ChartPath = &chartPath
		}

		// Parse since filter
		if sinceStr := query.Get("since"); sinceStr != "" {
			if since, err := time.Parse(time.RFC3339, sinceStr); err == nil {
				filters.Since = &since
			}
		}

		// Retrieve from storage
		summaries, err := store.List(r.Context(), filters)
		if err != nil {
			log.Errorf("Failed to list comparisons: %v", err)
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error":   "Failed to list comparisons",
			})
			return
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"success":     true,
			"comparisons": summaries,
			"count":       len(summaries),
		})
	}
}

// PopularChartsHandler handles GET /api/analytics/charts/popular requests
// Returns statistics about most compared charts
func PopularChartsHandler(store storage.ComparisonStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if store == nil {
			respondJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
				"success": false,
				"error":   "Storage is not enabled",
			})
			return
		}

		filters := &storage.AnalyticsFilters{
			Limit: 20,
		}

		// Parse limit
		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			var limit int
			if _, err := fmt.Sscanf(limitStr, "%d", &limit); err == nil && limit > 0 {
				filters.Limit = limit
			}
		}

		// Get analytics
		analytics, err := store.GetAnalytics(r.Context(), filters)
		if err != nil {
			log.Errorf("Failed to get analytics: %v", err)
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error":   "Failed to retrieve analytics",
			})
			return
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"success":        true,
			"popularCharts":  analytics.PopularCharts,
			"totalComparisons": analytics.TotalComparisons,
			"periodStart":    analytics.PeriodStart,
			"periodEnd":      analytics.PeriodEnd,
		})
	}
}
