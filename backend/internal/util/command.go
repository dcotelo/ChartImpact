package util

import "fmt"

// WrapCommandError wraps a command execution error with output for better debugging
func WrapCommandError(operation string, err error, output []byte) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s failed: %w\nOutput: %s", operation, err, string(output))
}
