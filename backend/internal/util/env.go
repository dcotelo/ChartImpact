package util

import (
	"os"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"
)

// GetBoolEnv retrieves a boolean environment variable with a default value
// Supports various truthy values: true, yes, 1, on (case-insensitive)
// and falsy values: false, no, 0, off (case-insensitive)
func GetBoolEnv(key string, defaultValue bool) bool {
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

// GetIntEnv retrieves an integer environment variable with a default value
func GetIntEnv(key string, defaultValue int) int {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}

	intVal, err := strconv.Atoi(val)
	if err != nil {
		log.Warnf("Invalid integer value '%s' for %s, using default: %d", val, key, defaultValue)
		return defaultValue
	}

	return intVal
}

// GetStringEnv retrieves a string environment variable with a default value
func GetStringEnv(key string, defaultValue string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}
	return val
}
