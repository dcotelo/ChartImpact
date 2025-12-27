package handlers

import (
	"net/http"
	"os/exec"

	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/util"
)

// HealthHandler handles GET /api/health requests
// Checks if the API is running and if required tools are available
func HealthHandler() http.HandlerFunc {
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
		}

		respondJSON(w, http.StatusOK, models.HealthResponse{
			Status:  status,
			Version: "1.0.0",
			HelmOK:  helmOK,
			GitOK:   gitOK,
			DyffOK:  dyffOK,
		})
	}
}
