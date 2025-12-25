package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	log "github.com/sirupsen/logrus"
)

// CORS handles Cross-Origin Resource Sharing
// Reads allowed origins, methods, and headers from environment variables
func CORS(next http.Handler) http.Handler {
	// Get CORS configuration from environment
	allowedOrigins := getEnvList("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"})
	allowedMethods := getEnvList("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	allowedHeaders := getEnvList("CORS_ALLOWED_HEADERS", []string{"Content-Type", "Authorization"})

	// Create CORS handler
	return handlers.CORS(
		handlers.AllowedOrigins(allowedOrigins),
		handlers.AllowedMethods(allowedMethods),
		handlers.AllowedHeaders(allowedHeaders),
		handlers.AllowCredentials(),
	)(next)
}

// Logging logs HTTP requests with response status and duration
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status code
		wrapped := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		// Call next handler
		next.ServeHTTP(wrapped, r)

		// Log request details
		duration := time.Since(start)
		log.WithFields(log.Fields{
			"method":   r.Method,
			"path":     r.URL.Path,
			"status":   wrapped.status,
			"duration": duration.String(),
			"ip":       r.RemoteAddr,
		}).Info("HTTP request")
	})
}

// Recovery recovers from panics and returns a 500 Internal Server Error
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.WithFields(log.Fields{
					"error": err,
					"path":  r.URL.Path,
				}).Error("Panic recovered")

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"success": false, "error": "Internal server error"}`))
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// statusWriter wraps http.ResponseWriter to capture status code
type statusWriter struct {
	http.ResponseWriter
	status int
}

// WriteHeader captures the status code
func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

// getEnvList retrieves a comma-separated environment variable and returns as a slice
func getEnvList(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
