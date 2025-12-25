package middleware

import (
	"net/http"
	"os"
	"strings"

	log "github.com/sirupsen/logrus"
)

// CORS middleware handles Cross-Origin Resource Sharing
// Configurable via environment variables:
// - CORS_ALLOWED_ORIGINS: comma-separated list of allowed origins
// - CORS_ALLOWED_METHODS: comma-separated list of allowed HTTP methods
// - CORS_ALLOWED_HEADERS: comma-separated list of allowed headers
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origins from environment or use default
		allowedOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
		origins := strings.Split(allowedOrigins, ",")

		// Check if origin is allowed
		origin := r.Header.Get("Origin")
		allowed := false
		for _, allowedOrigin := range origins {
			if strings.TrimSpace(allowedOrigin) == origin {
				allowed = true
				break
			}
		}

		// Set CORS headers if origin is allowed
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if len(origins) > 0 {
			// Default to first allowed origin if origin not in list
			w.Header().Set("Access-Control-Allow-Origin", strings.TrimSpace(origins[0]))
		}

		// Get allowed methods from environment or use default
		allowedMethods := getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Methods", allowedMethods)

		// Get allowed headers from environment or use default
		allowedHeaders := getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization")
		w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)

		// Allow credentials
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
