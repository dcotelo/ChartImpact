package middleware

import (
	"encoding/json"
	"net/http"
	"runtime/debug"

	log "github.com/sirupsen/logrus"
)

// Recovery middleware recovers from panics and returns a 500 error
// Logs the panic and stack trace for debugging
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic with stack trace
				log.WithFields(log.Fields{
					"error":      err,
					"stacktrace": string(debug.Stack()),
					"method":     r.Method,
					"path":       r.URL.Path,
				}).Error("Panic recovered")

				// Return 500 error
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success": false,
					"error":   "Internal server error",
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}
