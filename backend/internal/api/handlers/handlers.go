package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/service"
)

// CompareHandler handles requests to compare two Helm chart versions
// POST /api/compare
func CompareHandler(helmService *service.HelmService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Parse request body
		var req models.CompareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Errorf("Failed to parse request body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.CompareResponse{
				Success: false,
				Error:   fmt.Sprintf("Invalid request body: %v", err),
			})
			return
		}

		// Validate required fields
		if err := validateCompareRequest(&req); err != nil {
			log.Errorf("Request validation failed: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.CompareResponse{
				Success: false,
				Error:   err.Error(),
			})
			return
		}

		// Create context with timeout
		timeout := 120 * time.Second
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()

		// Perform comparison
		log.WithFields(log.Fields{
			"repository": req.Repository,
			"chartPath":  req.ChartPath,
			"version1":   req.Version1,
			"version2":   req.Version2,
		}).Info("Processing compare request")

		response, err := helmService.CompareVersions(ctx, &req)
		if err != nil {
			log.Errorf("Comparison failed: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.CompareResponse{
				Success: false,
				Error:   fmt.Sprintf("Comparison failed: %v", err),
			})
			return
		}

		// Return response
		if !response.Success {
			w.WriteHeader(http.StatusInternalServerError)
		}
		json.NewEncoder(w).Encode(response)
	}
}

// validateCompareRequest validates the compare request fields
func validateCompareRequest(req *models.CompareRequest) error {
	if req.Repository == "" {
		return fmt.Errorf("repository is required")
	}

	// Validate repository URL format
	repoPattern := regexp.MustCompile(`^(https?://|git@)`)
	if !repoPattern.MatchString(req.Repository) {
		return fmt.Errorf("invalid repository URL format. Must start with http://, https://, or git@")
	}

	if req.ChartPath == "" {
		return fmt.Errorf("chartPath is required")
	}

	if req.Version1 == "" {
		return fmt.Errorf("version1 is required")
	}

	if req.Version2 == "" {
		return fmt.Errorf("version2 is required")
	}

	// Provide helpful error messages for common monorepo patterns
	if req.ChartPath == "." || req.ChartPath == "/" {
		return fmt.Errorf("chartPath cannot be root directory. For monorepos, specify the chart subdirectory (e.g., 'charts/myapp')")
	}

	return nil
}

// VersionsHandler handles requests to fetch available versions from a repository
// POST /api/versions
func VersionsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Parse request body
		var req models.VersionsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Errorf("Failed to parse request body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.VersionsResponse{
				Success: false,
				Error:   fmt.Sprintf("Invalid request body: %v", err),
			})
			return
		}

		// Validate required fields
		if req.Repository == "" {
			log.Error("Repository is required")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.VersionsResponse{
				Success: false,
				Error:   "repository is required",
			})
			return
		}

		// Create context with timeout
		timeout := 60 * time.Second
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()

		// Fetch versions
		log.WithFields(log.Fields{
			"repository": req.Repository,
		}).Info("Processing versions request")

		response, err := service.FetchVersions(ctx, req.Repository)
		if err != nil {
			log.Errorf("Failed to fetch versions: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.VersionsResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to fetch versions: %v", err),
			})
			return
		}

		// Return response
		if !response.Success {
			w.WriteHeader(http.StatusInternalServerError)
		}
		json.NewEncoder(w).Encode(response)
	}
}

// HealthHandler handles health check requests
// GET /api/health
func HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Check if Helm is available
		helmOK := checkCommand("helm", "version", "--short")

		// Check if Git is available
		gitOK := checkCommand("git", "version")

		// Check if dyff is available
		dyffOK := checkCommand("dyff", "version")

		// Determine overall status
		status := "ok"
		if !helmOK || !gitOK {
			status = "error"
		}

		response := models.HealthResponse{
			Status:  status,
			Version: "1.0.0",
			HelmOK:  helmOK,
			GitOK:   gitOK,
			DyffOK:  dyffOK,
		}

		// Return appropriate status code
		if status == "error" {
			w.WriteHeader(http.StatusServiceUnavailable)
		}

		json.NewEncoder(w).Encode(response)
	}
}

// checkCommand checks if a command is available and executable
func checkCommand(name string, args ...string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, name, args...)
	return cmd.Run() == nil
}
