package diff

import (
	"fmt"
	"sort"
	"strings"

	log "github.com/sirupsen/logrus"
	"sigs.k8s.io/yaml"
)

// ParseManifests parses a YAML string containing multiple resources
// Returns a list of normalized resources
func ParseManifests(yamlContent string) ([]Resource, error) {
	if strings.TrimSpace(yamlContent) == "" {
		return []Resource{}, nil
	}

	// Split by YAML document separator
	docs := strings.Split(yamlContent, "\n---")
	resources := make([]Resource, 0)

	for _, doc := range docs {
		doc = strings.TrimSpace(doc)
		if doc == "" {
			continue
		}

		// Parse the YAML document
		var raw map[string]interface{}
		if err := yaml.Unmarshal([]byte(doc), &raw); err != nil {
			// Log warning for invalid YAML to aid debugging
			log.Warnf("Skipping invalid YAML document: %v", err)
			continue
		}

		// Skip empty documents
		if len(raw) == 0 {
			continue
		}

		// Extract resource
		resource, err := parseResource(raw)
		if err != nil {
			// Log warning when resource cannot be parsed
			log.Warnf("Skipping unparseable resource: %v", err)
			continue
		}

		resources = append(resources, resource)
	}

	return resources, nil
}

// parseResource converts a raw map to a normalized Resource
func parseResource(raw map[string]interface{}) (Resource, error) {
	resource := Resource{
		Other: make(map[string]interface{}),
	}

	// Extract apiVersion
	if apiVersion, ok := raw["apiVersion"].(string); ok {
		resource.APIVersion = apiVersion
	}

	// Extract kind
	if kind, ok := raw["kind"].(string); ok {
		resource.Kind = kind
	}

	// Validate required fields
	if resource.APIVersion == "" || resource.Kind == "" {
		return resource, fmt.Errorf("missing required fields: apiVersion or kind")
	}

	// Extract metadata
	if metadata, ok := raw["metadata"].(map[string]interface{}); ok {
		resource.Metadata = parseMetadata(metadata)
	}

	// Extract spec
	if spec, ok := raw["spec"].(map[string]interface{}); ok {
		resource.Spec = normalizeMap(spec)
	}

	// Extract data (for ConfigMaps, Secrets)
	if data, ok := raw["data"].(map[string]interface{}); ok {
		resource.Data = normalizeMap(data)
	}

	// Store other top-level fields
	for key, value := range raw {
		if key != "apiVersion" && key != "kind" && key != "metadata" && key != "spec" && key != "data" {
			resource.Other[key] = value
		}
	}

	return resource, nil
}

// parseMetadata extracts and normalizes metadata
func parseMetadata(metadata map[string]interface{}) Metadata {
	m := Metadata{
		Other: make(map[string]interface{}),
	}

	// Extract name
	if name, ok := metadata["name"].(string); ok {
		m.Name = name
	}

	// Extract namespace
	if namespace, ok := metadata["namespace"].(string); ok {
		m.Namespace = namespace
	}

	// Extract labels
	if labels, ok := metadata["labels"].(map[string]interface{}); ok {
		m.Labels = make(map[string]string)
		for k, v := range labels {
			if strVal, ok := v.(string); ok {
				m.Labels[k] = strVal
			}
		}
	}

	// Extract annotations
	if annotations, ok := metadata["annotations"].(map[string]interface{}); ok {
		m.Annotations = make(map[string]string)
		for k, v := range annotations {
			if strVal, ok := v.(string); ok {
				m.Annotations[k] = strVal
			}
		}
	}

	// Store other metadata fields
	for key, value := range metadata {
		if key != "name" && key != "namespace" && key != "labels" && key != "annotations" {
			m.Other[key] = value
		}
	}

	return m
}

// normalizeMap recursively normalizes a map for comparison
// Sorts map keys and handles nested structures
func normalizeMap(m map[string]interface{}) map[string]interface{} {
	normalized := make(map[string]interface{})
	for key, value := range m {
		normalized[key] = normalizeValue(value)
	}
	return normalized
}

// normalizeValue normalizes a value for comparison
func normalizeValue(value interface{}) interface{} {
	switch v := value.(type) {
	case map[string]interface{}:
		return normalizeMap(v)
	case []interface{}:
		normalized := make([]interface{}, len(v))
		for i, item := range v {
			normalized[i] = normalizeValue(item)
		}
		return normalized
	default:
		return v
	}
}

// GetResourceKey returns a unique key for a resource
func GetResourceKey(resource Resource) ResourceKey {
	return ResourceKey{
		APIVersion: resource.APIVersion,
		Kind:       resource.Kind,
		Name:       resource.Metadata.Name,
		Namespace:  resource.Metadata.Namespace,
	}
}

// GetResourcesByKey creates a map of resources by their keys
func GetResourcesByKey(resources []Resource) map[ResourceKey]Resource {
	result := make(map[ResourceKey]Resource)
	for _, resource := range resources {
		key := GetResourceKey(resource)
		result[key] = resource
	}
	return result
}

// GetSortedKeys returns sorted resource keys for deterministic iteration
func GetSortedKeys(keys map[ResourceKey]Resource) []ResourceKey {
	sorted := make([]ResourceKey, 0, len(keys))
	for key := range keys {
		sorted = append(sorted, key)
	}

	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].APIVersion != sorted[j].APIVersion {
			return sorted[i].APIVersion < sorted[j].APIVersion
		}
		if sorted[i].Kind != sorted[j].Kind {
			return sorted[i].Kind < sorted[j].Kind
		}
		if sorted[i].Namespace != sorted[j].Namespace {
			return sorted[i].Namespace < sorted[j].Namespace
		}
		return sorted[i].Name < sorted[j].Name
	})

	return sorted
}
