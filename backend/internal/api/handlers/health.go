package handlers

import (
	"context"
	"net/http"
	"os/exec"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/storage"
	"github.com/dcotelo/chartimpact/backend/internal/util"
)

// HealthHandler handles GET /api/health requests
// Checks if the API is running and if required tools are available
func HealthHandler(store storage.ComparisonStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if Helm is available
		helmOK := false
		if _, err := exec.LookPath("helm"); err == nil {
			helmOK = true
		}

		// Check if Git is available
		gitOK := false
		if _, err := exec.LookPath("git"); err == nil {
			gitOK = true
		}

		// DEPRECATED: dyff support is deprecated and will be removed in a future version
		// Check if dyff is available (optional - internal diff engine is the recommended approach)
		dyffOK := false
		if _, err := exec.LookPath("dyff"); err == nil {
			dyffOK = true
		}

		// Check database health if storage is enabled
		dbOK := true // Default to true if storage is disabled
		if store != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()

			// Try a simple query to check DB connectivity
			_, err := store.DeleteExpired(ctx) // This is read-only operation that returns 0 if no expired rows
			if err != nil {
				dbOK = false
				log.Warnf("Database health check failed: %v", err)
			}
		}

		// Status is ok if required tools are available
		// DEPRECATED: dyff is optional and deprecated - internal diff engine is the recommended approach
		status := "ok"
		if !helmOK || !gitOK {
			status = "degraded"
			log.Warn("Health check: Missing required tools")
		} else if !util.GetBoolEnv("INTERNAL_DIFF_ENABLED", true) {
			// DEPRECATED: Internal diff should always be enabled. Disabling it is not recommended.
			status = "degraded"
			log.Warn("Health check: DEPRECATED configuration detected - internal diff is disabled. This configuration is deprecated and will not be supported in future versions.")
		} else if store != nil && !dbOK {
			status = "degraded"
			log.Warn("Health check: Database connection failed")
		}

		response := models.HealthResponse{
			Status:  status,
			Version: "1.0.0",
			HelmOK:  helmOK,
			GitOK:   gitOK,
			DyffOK:  dyffOK,
		}

		// Add storage information if enabled
		if store != nil {
			storageType := util.GetStringEnv("STORAGE_TYPE", "disk")
			analyticsSupported := storageType == "postgres"

			responseMap := map[string]interface{}{
				"status":             response.Status,
				"version":            response.Version,
				"helmOK":             response.HelmOK,
				"gitOK":              response.GitOK,
				"dyffOK":             response.DyffOK,
				"dbOK":               dbOK,
				"storageType":        storageType,
				"analyticsSupported": analyticsSupported,
			}
			respondJSON(w, http.StatusOK, responseMap)
			return
		}

		respondJSON(w, http.StatusOK, response)
	}
}
