package diff

import (
	"strings"
)

// classifySemanticType determines the semantic type based on the path
func classifySemanticType(path string) string {
	// Match common Kubernetes paths to semantic types
	switch {
	case strings.Contains(path, ".image"):
		return "container.image"
	case strings.Contains(path, ".env"):
		return "container.env"
	case strings.Contains(path, ".replicas"):
		return "workload.replicas"
	case strings.Contains(path, ".resources.limits.cpu") || strings.Contains(path, ".resources.requests.cpu"):
		return "resources.cpu"
	case strings.Contains(path, ".resources.limits.memory") || strings.Contains(path, ".resources.requests.memory"):
		return "resources.memory"
	case strings.Contains(path, ".resources"):
		return "resources.general"
	case strings.Contains(path, ".ports"):
		return "service.port"
	case strings.Contains(path, ".rules") && strings.Contains(path, "ingress"):
		return "ingress.rule"
	case strings.Contains(path, "metadata.annotations"):
		return "metadata.annotation"
	case strings.Contains(path, "metadata.labels"):
		return "metadata.label"
	case strings.Contains(path, ".volumeMounts") || strings.Contains(path, ".volumes"):
		return "storage.volume"
	case strings.Contains(path, ".securityContext"):
		return "security.context"
	case strings.Contains(path, ".serviceAccountName"):
		return "security.serviceAccount"
	default:
		return ""
	}
}

// classifyChangeCategory determines the high-level category of a change
func classifyChangeCategory(path string) string {
	switch {
	case strings.Contains(path, ".resources.limits") ||
		strings.Contains(path, ".resources.requests"):
		return "resources"
	case strings.Contains(path, ".replicas") ||
		strings.Contains(path, ".image") ||
		strings.Contains(path, ".containers") ||
		strings.Contains(path, ".initContainers"):
		return "workload"
	case strings.Contains(path, ".ports") ||
		strings.Contains(path, ".service") ||
		strings.Contains(path, ".ingress"):
		return "networking"
	case strings.Contains(path, ".securityContext") ||
		strings.Contains(path, ".serviceAccountName") ||
		strings.Contains(path, ".imagePullSecrets"):
		return "security"
	case strings.Contains(path, ".env") ||
		strings.Contains(path, ".configMap") ||
		strings.Contains(path, ".secret"):
		return "config"
	case strings.Contains(path, "metadata.labels") ||
		strings.Contains(path, "metadata.annotations") ||
		strings.Contains(path, "metadata.name"):
		return "metadata"
	case strings.Contains(path, ".volumes") ||
		strings.Contains(path, ".volumeMounts") ||
		strings.Contains(path, ".persistentVolumeClaim"):
		return "storage"
	default:
		return "unknown"
	}
}

// determineImportance assigns an importance level to a change
func determineImportance(path string, semanticType string) string {
	// Critical changes
	if strings.Contains(path, ".image") ||
		strings.Contains(path, ".replicas") ||
		strings.Contains(path, ".securityContext") {
		return "high"
	}

	// Important changes
	if strings.Contains(path, ".resources.limits") ||
		strings.Contains(path, ".resources.requests") ||
		strings.Contains(path, ".env") ||
		strings.Contains(path, ".ports") {
		return "medium"
	}

	// Minor changes
	if strings.Contains(path, "metadata.labels") ||
		strings.Contains(path, "metadata.annotations") {
		return "low"
	}

	return "medium"
}

// determineFlags adds semantic flags to a change
func determineFlags(path string, semanticType string) []string {
	flags := []string{}

	if strings.Contains(path, ".image") {
		flags = append(flags, "runtime-impact", "rollout-trigger")
	}

	if strings.Contains(path, ".replicas") {
		flags = append(flags, "scaling-change", "runtime-impact")
	}

	if strings.Contains(path, ".resources.limits") ||
		strings.Contains(path, ".resources.requests") {
		flags = append(flags, "runtime-impact")
	}

	if strings.Contains(path, ".securityContext") {
		flags = append(flags, "security-impact", "breaking-change")
	}

	if strings.Contains(path, ".ports") {
		flags = append(flags, "networking-change")
	}

	return flags
}

// getValueType determines the JSON type of a value
func getValueType(value interface{}) string {
	if value == nil {
		return "null"
	}

	switch value.(type) {
	case string:
		return "string"
	case bool:
		return "boolean"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "integer"
	case float32, float64:
		return "number"
	case []interface{}:
		return "array"
	case map[string]interface{}:
		return "object"
	default:
		return "unknown"
	}
}
