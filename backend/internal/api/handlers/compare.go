package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"

	"github.com/dcotelo/chartimpact/backend/internal/models"
	"github.com/dcotelo/chartimpact/backend/internal/service"
	"github.com/dcotelo/chartimpact/backend/internal/storage"
	"github.com/dcotelo/chartimpact/backend/internal/util"
)

// CompareHandler handles POST /api/compare requests
// Validates the request, calls HelmService to compare chart versions, and returns the diff
func CompareHandler(helmService *service.HelmService, store storage.ComparisonStore) http.HandlerFunc {
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

		// Check storage for existing result (if enabled)
		if store != nil {
			contentHash := storage.ComputeContentHash(&req)
			log.Debugf("Content hash: %s", contentHash)
			
			// Try to find existing comparison
			existing, err := store.GetByHash(ctx, contentHash)
			if err == nil && existing != nil {
				log.Infof("Cache hit for hash %s, returning stored result %s", contentHash[:8], existing.CompareID)
				
				// Return cached result
				response := models.CompareResponse{
					Success:                 true,
					Diff:                    "", // Legacy, can be empty
					StructuredDiff:          existing.StructuredDiff,
					StructuredDiffAvailable: true,
					Version1:                existing.Version1,
					Version2:                existing.Version2,
				}
				
				respondJSON(w, http.StatusOK, response)
				return
			}
		}

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

		// Store result if storage is enabled and comparison was successful
		if store != nil && response.Success && response.StructuredDiff != nil {
			go func() {
				storeCtx, storeCancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer storeCancel()
				
				retentionDays := util.GetIntEnv("RESULT_TTL_DAYS", 30)
				contentHash := storage.ComputeContentHash(&req)
				
				// Ensure compare_id exists in metadata
				if response.StructuredDiff.Metadata.CompareID == "" {
					response.StructuredDiff.Metadata.CompareID = uuid.New().String()
				}
				
				compareID, err := uuid.Parse(response.StructuredDiff.Metadata.CompareID)
				if err != nil {
					log.Errorf("Invalid compare_id format: %v", err)
					return
				}
				
				valuesSHA256 := ""
				if req.ValuesContent != nil && *req.ValuesContent != "" {
					valuesSHA256 = storage.ComputeValuesSHA256(*req.ValuesContent)
				}
				
				saveReq := &storage.SaveComparisonRequest{
					CompareID:      compareID,
					ContentHash:    contentHash,
					Repository:     req.Repository,
					ChartPath:      req.ChartPath,
					Version1:       req.Version1,
					Version2:       req.Version2,
					ValuesFile:     req.ValuesFile,
					ValuesSHA256:   stringPtrIfNotEmpty(valuesSHA256),
					StructuredDiff: response.StructuredDiff,
					EngineVersion:  response.StructuredDiff.Metadata.EngineVersion,
					HelmVersion:    "", // Could extract from metadata if available
					RetentionDays:  retentionDays,
				}
				
				stored, err := store.Save(storeCtx, saveReq)
				if err != nil {
					log.Errorf("Failed to store comparison result: %v", err)
				} else {
					if stored.Deduplicated {
						log.Infof("Stored comparison result (deduplicated): %s", stored.CompareID)
					} else {
						log.Infof("Stored comparison result: %s (expires: %s)", stored.CompareID, stored.ExpiresAt.Format(time.RFC3339))
					}
				}
			}()
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

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// stringPtrIfNotEmpty returns a pointer to a string if not empty
func stringPtrIfNotEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
