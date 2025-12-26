package util

import (
	"os"
	"testing"
)

func TestGetBoolEnv(t *testing.T) {
	tests := []struct {
		name         string
		envValue     string
		defaultValue bool
		expected     bool
	}{
		// Test truthy values
		{"true value", "true", false, true},
		{"yes value", "yes", false, true},
		{"1 value", "1", false, true},
		{"on value", "on", false, true},
		{"TRUE uppercase", "TRUE", false, true},
		{"Yes mixed case", "Yes", false, true},

		// Test falsy values
		{"false value", "false", true, false},
		{"no value", "no", true, false},
		{"0 value", "0", true, false},
		{"off value", "off", true, false},
		{"FALSE uppercase", "FALSE", true, false},

		// Test defaults
		{"empty string default true", "", true, true},
		{"empty string default false", "", false, false},
		{"unrecognized value default true", "maybe", true, true},
		{"unrecognized value default false", "maybe", false, false},

		// Test whitespace handling
		{"whitespace around true", "  true  ", false, true},
		{"whitespace around false", "  false  ", true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable
			key := "TEST_BOOL_ENV"
			if tt.envValue != "" {
				os.Setenv(key, tt.envValue)
				defer os.Unsetenv(key)
			} else {
				os.Unsetenv(key)
			}

			result := GetBoolEnv(key, tt.defaultValue)
			if result != tt.expected {
				t.Errorf("GetBoolEnv(%q, %v) = %v; want %v", tt.envValue, tt.defaultValue, result, tt.expected)
			}
		})
	}
}
