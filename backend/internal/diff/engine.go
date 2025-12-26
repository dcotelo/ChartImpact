package diff

import (
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strings"
)

// Engine is the internal diff engine
type Engine struct {
	IgnoreLabels      bool
	IgnoreAnnotations bool
}

// NewEngine creates a new diff engine
func NewEngine() *Engine {
	return &Engine{}
}

// Compare compares two YAML manifests and returns a structured diff
func (e *Engine) Compare(manifest1, manifest2 string) (*DiffResult, error) {
	// Parse both manifests
	resources1, err := ParseManifests(manifest1)
	if err != nil {
		return nil, fmt.Errorf("failed to parse manifest1: %w", err)
	}

	resources2, err := ParseManifests(manifest2)
	if err != nil {
		return nil, fmt.Errorf("failed to parse manifest2: %w", err)
	}

	// Create resource maps
	map1 := GetResourcesByKey(resources1)
	map2 := GetResourcesByKey(resources2)

	// Collect all keys
	allKeys := make(map[ResourceKey]bool)
	for key := range map1 {
		allKeys[key] = true
	}
	for key := range map2 {
		allKeys[key] = true
	}

	// Get sorted keys for deterministic output
	keysMap := make(map[ResourceKey]Resource)
	for key := range allKeys {
		keysMap[key] = Resource{}
	}
	sortedKeys := GetSortedKeys(keysMap)

	// Generate diff results
	result := &DiffResult{
		Summary:   Summary{},
		Resources: make([]ResourceDiff, 0),
	}

	for _, key := range sortedKeys {
		resource1, exists1 := map1[key]
		resource2, exists2 := map2[key]

		var resourceDiff ResourceDiff

		if exists1 && !exists2 {
			// Resource removed
			resourceDiff = ResourceDiff{
				APIVersion: key.APIVersion,
				Kind:       key.Kind,
				Name:       key.Name,
				Namespace:  key.Namespace,
				ChangeType: ChangeTypeRemoved,
			}
			result.Summary.Removed++
		} else if !exists1 && exists2 {
			// Resource added
			resourceDiff = ResourceDiff{
				APIVersion: key.APIVersion,
				Kind:       key.Kind,
				Name:       key.Name,
				Namespace:  key.Namespace,
				ChangeType: ChangeTypeAdded,
			}
			result.Summary.Added++
		} else {
			// Resource exists in both, check for modifications
			fields := e.compareResources(resource1, resource2)
			if len(fields) > 0 {
				resourceDiff = ResourceDiff{
					APIVersion: key.APIVersion,
					Kind:       key.Kind,
					Name:       key.Name,
					Namespace:  key.Namespace,
					ChangeType: ChangeTypeModified,
					Fields:     fields,
				}
				result.Summary.Modified++
			} else {
				// No changes, skip this resource
				continue
			}
		}

		result.Resources = append(result.Resources, resourceDiff)
	}

	result.Summary.Total = result.Summary.Added + result.Summary.Removed + result.Summary.Modified

	// Generate raw diff output for backward compatibility
	result.Raw = e.generateRawDiff(result)

	return result, nil
}

// compareResources compares two resources and returns field-level diffs
func (e *Engine) compareResources(r1, r2 Resource) []FieldDiff {
	diffs := make([]FieldDiff, 0)

	// Compare metadata (excluding labels and annotations if configured)
	if !e.IgnoreLabels {
		diffs = append(diffs, e.compareStringMaps("metadata.labels", r1.Metadata.Labels, r2.Metadata.Labels)...)
	}
	if !e.IgnoreAnnotations {
		diffs = append(diffs, e.compareStringMaps("metadata.annotations", r1.Metadata.Annotations, r2.Metadata.Annotations)...)
	}

	// Compare other metadata fields
	diffs = append(diffs, e.compareMaps("metadata", r1.Metadata.Other, r2.Metadata.Other)...)

	// Compare spec
	diffs = append(diffs, e.compareMaps("spec", r1.Spec, r2.Spec)...)

	// Compare data
	diffs = append(diffs, e.compareMaps("data", r1.Data, r2.Data)...)

	// Compare other fields
	diffs = append(diffs, e.compareMaps("", r1.Other, r2.Other)...)

	return diffs
}

// compareStringMaps compares two string maps
func (e *Engine) compareStringMaps(basePath string, map1, map2 map[string]string) []FieldDiff {
	diffs := make([]FieldDiff, 0)

	// Collect all keys
	allKeys := make(map[string]bool)
	for key := range map1 {
		allKeys[key] = true
	}
	for key := range map2 {
		allKeys[key] = true
	}

	// Get sorted keys for deterministic output
	sortedKeys := make([]string, 0, len(allKeys))
	for key := range allKeys {
		sortedKeys = append(sortedKeys, key)
	}
	sort.Strings(sortedKeys)

	for _, key := range sortedKeys {
		val1, exists1 := map1[key]
		val2, exists2 := map2[key]

		path := basePath + "." + key

		if exists1 && !exists2 {
			diffs = append(diffs, FieldDiff{
				Path:     path,
				OldValue: val1,
				Type:     ChangeTypeRemoved,
			})
		} else if !exists1 && exists2 {
			diffs = append(diffs, FieldDiff{
				Path:     path,
				NewValue: val2,
				Type:     ChangeTypeAdded,
			})
		} else if val1 != val2 {
			diffs = append(diffs, FieldDiff{
				Path:     path,
				OldValue: val1,
				NewValue: val2,
				Type:     ChangeTypeModified,
			})
		}
	}

	return diffs
}

// compareMaps compares two generic maps
func (e *Engine) compareMaps(basePath string, map1, map2 map[string]interface{}) []FieldDiff {
	diffs := make([]FieldDiff, 0)

	// Collect all keys
	allKeys := make(map[string]bool)
	for key := range map1 {
		allKeys[key] = true
	}
	for key := range map2 {
		allKeys[key] = true
	}

	// Get sorted keys for deterministic output
	sortedKeys := make([]string, 0, len(allKeys))
	for key := range allKeys {
		sortedKeys = append(sortedKeys, key)
	}
	sort.Strings(sortedKeys)

	for _, key := range sortedKeys {
		val1, exists1 := map1[key]
		val2, exists2 := map2[key]

		var path string
		if basePath == "" {
			path = key
		} else {
			path = basePath + "." + key
		}

		if exists1 && !exists2 {
			diffs = append(diffs, FieldDiff{
				Path:     path,
				OldValue: val1,
				Type:     ChangeTypeRemoved,
			})
		} else if !exists1 && exists2 {
			diffs = append(diffs, FieldDiff{
				Path:     path,
				NewValue: val2,
				Type:     ChangeTypeAdded,
			})
		} else if !e.deepEqual(val1, val2) {
			// Check if both are maps - recurse
			if m1, ok1 := val1.(map[string]interface{}); ok1 {
				if m2, ok2 := val2.(map[string]interface{}); ok2 {
					diffs = append(diffs, e.compareMaps(path, m1, m2)...)
					continue
				}
			}

			diffs = append(diffs, FieldDiff{
				Path:     path,
				OldValue: val1,
				NewValue: val2,
				Type:     ChangeTypeModified,
			})
		}
	}

	return diffs
}

// deepEqual compares two values for equality
func (e *Engine) deepEqual(v1, v2 interface{}) bool {
	// Use reflect.DeepEqual for deep comparison
	return reflect.DeepEqual(v1, v2)
}

// generateRawDiff generates a human-readable diff output
func (e *Engine) generateRawDiff(result *DiffResult) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("=== Diff Summary ===\n"))
	sb.WriteString(fmt.Sprintf("Resources Added:    %d\n", result.Summary.Added))
	sb.WriteString(fmt.Sprintf("Resources Removed:  %d\n", result.Summary.Removed))
	sb.WriteString(fmt.Sprintf("Resources Modified: %d\n", result.Summary.Modified))
	sb.WriteString(fmt.Sprintf("Total Changes:      %d\n\n", result.Summary.Total))

	for _, resourceDiff := range result.Resources {
		sb.WriteString(fmt.Sprintf("--- %s/%s (%s/%s) ---\n",
			resourceDiff.Kind,
			resourceDiff.Name,
			resourceDiff.APIVersion,
			resourceDiff.Namespace))
		sb.WriteString(fmt.Sprintf("Change Type: %s\n", resourceDiff.ChangeType))

		if len(resourceDiff.Fields) > 0 {
			sb.WriteString("Fields Changed:\n")
			for _, field := range resourceDiff.Fields {
				sb.WriteString(fmt.Sprintf("  %s [%s]\n", field.Path, field.Type))
				if field.Type == ChangeTypeRemoved {
					sb.WriteString(fmt.Sprintf("    - %v\n", e.formatValue(field.OldValue)))
				} else if field.Type == ChangeTypeAdded {
					sb.WriteString(fmt.Sprintf("    + %v\n", e.formatValue(field.NewValue)))
				} else {
					sb.WriteString(fmt.Sprintf("    - %v\n", e.formatValue(field.OldValue)))
					sb.WriteString(fmt.Sprintf("    + %v\n", e.formatValue(field.NewValue)))
				}
			}
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// formatValue formats a value for display
func (e *Engine) formatValue(value interface{}) string {
	if value == nil {
		return "<nil>"
	}

	// For complex types, use JSON encoding
	switch v := value.(type) {
	case string:
		return v
	case map[string]interface{}, []interface{}:
		data, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprintf("%v", v)
		}
		return string(data)
	default:
		return fmt.Sprintf("%v", v)
	}
}
