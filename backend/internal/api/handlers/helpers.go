package handlers

import "net/http"

// requireStorage checks if storage is available and returns an error response if not
// Returns true if storage is available, false if an error response was sent
func requireStorage(store interface{}, w http.ResponseWriter) bool {
	if store == nil {
		respondJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
			"success": false,
			"error":   "Storage is not enabled",
		})
		return false
	}
	return true
}

// errorResponse creates a standardized error response map
func errorResponse(message string) map[string]interface{} {
	return map[string]interface{}{
		"success": false,
		"error":   message,
	}
}
