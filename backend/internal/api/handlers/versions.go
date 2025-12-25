package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/service"
)

// VersionsHandler handles POST /api/versions requests
// Fetches available Git tags and branches from a repository
func VersionsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse request body
		var req models.VersionsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Errorf("Failed to decode request body: %v", err)
			respondJSON(w, http.StatusBadRequest, models.VersionsResponse{
				Success: false,
				Error:   "Invalid request body: " + err.Error(),
			})
			return
		}

		// Validate repository URL
		if req.Repository == "" {
			respondJSON(w, http.StatusBadRequest, models.VersionsResponse{
				Success: false,
				Error:   "Repository URL is required",
			})
			return
		}

		// Get timeout from environment or use default
		timeout := getTimeoutFromEnv("VERSIONS_TIMEOUT", 60)
		ctx, cancel := context.WithTimeout(r.Context(), time.Duration(timeout)*time.Second)
		defer cancel()

		log.WithFields(log.Fields{
			"repository": req.Repository,
		}).Info("Received versions request")

		// Fetch versions from repository
		response, err := service.FetchVersions(ctx, req.Repository)
		if err != nil {
			log.Errorf("Failed to fetch versions: %v", err)
			respondJSON(w, http.StatusInternalServerError, models.VersionsResponse{
				Success: false,
				Error:   "Internal server error: " + err.Error(),
			})
			return
		}

		// Return response
		if response.Success {
			respondJSON(w, http.StatusOK, response)
		} else {
			respondJSON(w, http.StatusBadRequest, response)
		}
	}
}
