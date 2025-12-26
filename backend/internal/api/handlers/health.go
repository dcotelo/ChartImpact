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

		// Check if dyff is available (optional - internal diff engine can be used instead)
		dyffOK := false
		if _, err := exec.LookPath("dyff"); err == nil {
			dyffOK = true
		}

		// Status is ok if required tools are available
		// dyff is optional when internal diff engine is enabled (default: true)
		status := "ok"
		if !helmOK || !gitOK {
			status = "degraded"
			log.Warn("Health check: Missing required tools")
		} else if !util.GetBoolEnv("INTERNAL_DIFF_ENABLED", true) && !dyffOK {
			// dyff is only required when internal diff is not enabled
			status = "degraded"
			log.Warn("Health check: dyff not available and internal diff not enabled")
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
