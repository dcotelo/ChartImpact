package handlers

import (
	"net/http"
	"os"
	"os/exec"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
)

// getBoolEnv retrieves a boolean environment variable with a default value
// Supports various truthy values: true, yes, 1, on (case-insensitive)
// and falsy values: false, no, 0, off (case-insensitive)
func getBoolEnv(key string, defaultValue bool) bool {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}

	// Normalize to lowercase for comparison
	val = strings.ToLower(strings.TrimSpace(val))

	// Check for truthy values
	if val == "true" || val == "yes" || val == "1" || val == "on" {
		return true
	}

	// Check for falsy values
	if val == "false" || val == "no" || val == "0" || val == "off" {
		return false
	}

	// If unrecognized, use default
	log.Warnf("Unrecognized boolean value '%s' for %s, using default: %v", val, key, defaultValue)
	return defaultValue
}

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
		} else if !getBoolEnv("INTERNAL_DIFF_ENABLED", true) && !dyffOK {
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
