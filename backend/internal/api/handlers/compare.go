package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/yourusername/chartimpact/backend/internal/models"
	"github.com/yourusername/chartimpact/backend/internal/service"
)

// CompareHandler handles POST /api/compare requests
// Validates the request, calls HelmService to compare chart versions, and returns the diff
func CompareHandler(helmService *service.HelmService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse request body
		var req models.CompareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Errorf("Failed to decode request body: %v", err)
			respondJSON(w, http.StatusBadRequest, models.CompareResponse{
				Success: false,
				Error:   "Invalid request body: " + err.Error(),
			})
			return
		}

		// Validate required fields
		if req.Repository == "" {
			respondJSON(w, http.StatusBadRequest, models.CompareResponse{
				Success: false,
				Error:   "Repository URL is required",
			})
			return
		}

		if req.ChartPath == "" {
			respondJSON(w, http.StatusBadRequest, models.CompareResponse{
				Success: false,
				Error:   "Chart path is required",
			})
			return
		}

		if req.Version1 == "" {
			respondJSON(w, http.StatusBadRequest, models.CompareResponse{
				Success: false,
				Error:   "Version 1 is required",
			})
			return
		}

		if req.Version2 == "" {
			respondJSON(w, http.StatusBadRequest, models.CompareResponse{
				Success: false,
				Error:   "Version 2 is required",
			})
			return
		}

		// Validate repository URL format
		if !strings.HasPrefix(req.Repository, "https://") &&
			!strings.HasPrefix(req.Repository, "http://") &&
			!strings.HasPrefix(req.Repository, "git@") {
			respondJSON(w, http.StatusBadRequest, models.CompareResponse{
				Success: false,
				Error:   "Invalid repository URL format. Must start with https://, http://, or git@",
			})
			return
		}

		// Get timeout from environment or use default
		timeout := getTimeoutFromEnv("COMPARE_TIMEOUT", 120)
		ctx, cancel := context.WithTimeout(r.Context(), time.Duration(timeout)*time.Second)
		defer cancel()

		log.WithFields(log.Fields{
			"repository": req.Repository,
			"chartPath":  req.ChartPath,
			"version1":   req.Version1,
			"version2":   req.Version2,
		}).Info("Received compare request")

		// Call Helm service to compare versions
		response, err := helmService.CompareVersions(ctx, &req)
		if err != nil {
			log.Errorf("Failed to compare versions: %v", err)
			respondJSON(w, http.StatusInternalServerError, models.CompareResponse{
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

// getTimeoutFromEnv retrieves a timeout value from environment or returns default
func getTimeoutFromEnv(key string, defaultValue int) int {
	if val := os.Getenv(key); val != "" {
		if timeout, err := strconv.Atoi(val); err == nil {
			return timeout
		}
	}
	return defaultValue
}

// respondJSON writes a JSON response to the client
func respondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Errorf("Failed to encode response: %v", err)
	}
}
