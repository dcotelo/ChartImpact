package diff

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	// EngineVersion is the version of the diff specification
	EngineVersion = "1.0.0"
)

// Engine is the internal diff engine
type Engine struct {
	IgnoreLabels      bool
	IgnoreAnnotations bool
	
	// Metadata for traceability
	LeftSource  *SourceMetadata
	RightSource *SourceMetadata
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

	// Initialize result with metadata
	result := &DiffResult{
		Metadata: DiffMetadata{
			EngineVersion: EngineVersion,
			CompareID:     uuid.New().String(),
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			Inputs: InputMetadata{
				Left:  e.getSourceMetadata(true),
				Right: e.getSourceMetadata(false),
			},
			NormalizationRules: e.getNormalizationRules(),
		},
		Resources: make([]ResourceDiff, 0),
		Stats: &Stats{
			Resources: StatsResources{},
			Changes:   StatsChanges{},
		},
		Summary: Summary{}, // Legacy field
	}

	totalChanges := 0

	for _, key := range sortedKeys {
		resource1, exists1 := map1[key]
		resource2, exists2 := map2[key]

		var resourceDiff ResourceDiff

		if exists1 && !exists2 {
			// Resource removed
			resourceDiff = e.createResourceDiff(key, resource1, Resource{}, ChangeTypeRemoved)
			result.Stats.Resources.Removed++
			result.Summary.Removed++ // Legacy
		} else if !exists1 && exists2 {
			// Resource added
			resourceDiff = e.createResourceDiff(key, Resource{}, resource2, ChangeTypeAdded)
			result.Stats.Resources.Added++
			result.Summary.Added++ // Legacy
		} else {
			// Resource exists in both, check for modifications
			changes := e.compareResources(resource1, resource2)
			if len(changes) > 0 {
				resourceDiff = e.createResourceDiff(key, resource1, resource2, ChangeTypeModified)
				resourceDiff.Changes = changes
				
				// Calculate summary
				resourceDiff.Summary = e.calculateResourceSummary(changes)
				
				// Convert to legacy Fields format
				resourceDiff.Fields = e.convertToFieldDiffs(changes)
				
				result.Stats.Resources.Modified++
				result.Summary.Modified++ // Legacy
				totalChanges += len(changes)
			} else {
				// No changes, skip this resource
				continue
			}
		}

		result.Resources = append(result.Resources, resourceDiff)
	}

	result.Stats.Changes.Total = totalChanges
	result.Summary.Total = result.Summary.Added + result.Summary.Removed + result.Summary.Modified // Legacy

	// Generate raw diff output for backward compatibility
	result.Raw = e.generateRawDiff(result)

	return result, nil
}

// compareResources compares two resources and returns field-level diffs
func (e *Engine) compareResources(r1, r2 Resource) []Change {
	changes := make([]Change, 0)

	// Compare metadata (excluding labels and annotations if configured)
	if !e.IgnoreLabels {
		changes = append(changes, e.compareStringMaps("metadata.labels", r1.Metadata.Labels, r2.Metadata.Labels)...)
	}
	if !e.IgnoreAnnotations {
		changes = append(changes, e.compareStringMaps("metadata.annotations", r1.Metadata.Annotations, r2.Metadata.Annotations)...)
	}

	// Compare other metadata fields
	changes = append(changes, e.compareMaps("metadata", r1.Metadata.Other, r2.Metadata.Other)...)

	// Compare spec
	changes = append(changes, e.compareMaps("spec", r1.Spec, r2.Spec)...)

	// Compare data
	changes = append(changes, e.compareMaps("data", r1.Data, r2.Data)...)

	// Compare other fields
	changes = append(changes, e.compareMaps("", r1.Other, r2.Other)...)

	return changes
}

// createResourceDiff creates a ResourceDiff with both new and legacy formats
func (e *Engine) createResourceDiff(key ResourceKey, before, after Resource, changeType ChangeType) ResourceDiff {
	rd := ResourceDiff{
		Identity: ResourceIdentity{
			APIVersion: key.APIVersion,
			Kind:       key.Kind,
			Name:       key.Name,
			Namespace:  key.Namespace,
			UID:        nil,
		},
		ChangeType: changeType,
		Changes:    []Change{},
		
		// Legacy fields
		APIVersion: key.APIVersion,
		Kind:       key.Kind,
		Name:       key.Name,
		Namespace:  key.Namespace,
		Fields:     []FieldDiff{},
	}

	// Calculate hashes for modified resources
	if changeType == ChangeTypeModified || changeType == ChangeTypeRemoved {
		rd.BeforeHash = e.calculateResourceHash(before)
	}
	if changeType == ChangeTypeModified || changeType == ChangeTypeAdded {
		rd.AfterHash = e.calculateResourceHash(after)
	}

	return rd
}

// calculateResourceHash computes a SHA256 hash of the resource
func (e *Engine) calculateResourceHash(r Resource) string {
	data, err := json.Marshal(r)
	if err != nil {
		return ""
	}
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// getSourceMetadata returns metadata for left or right source
func (e *Engine) getSourceMetadata(isLeft bool) SourceMetadata {
	if isLeft && e.LeftSource != nil {
		return *e.LeftSource
	}
	if !isLeft && e.RightSource != nil {
		return *e.RightSource
	}
	return SourceMetadata{
		Source: "helm",
	}
}

// getNormalizationRules returns the list of normalization rules applied
func (e *Engine) getNormalizationRules() []string {
	rules := []string{}
	
	if e.IgnoreLabels {
		rules = append(rules, "ignoreLabels")
	}
	if e.IgnoreAnnotations {
		rules = append(rules, "ignoreAnnotations")
	}
	
	// Always applied normalization
	rules = append(rules, "normalizeDefaults")
	
	return rules
}

// calculateResourceSummary generates a summary for a resource's changes
func (e *Engine) calculateResourceSummary(changes []Change) *ResourceSummary {
	summary := &ResourceSummary{
		TotalChanges: len(changes),
		ByImportance: make(map[string]int),
		Categories:   []string{},
	}

	categorySet := make(map[string]bool)

	for _, change := range changes {
		// Count by importance
		if change.Importance != "" {
			summary.ByImportance[change.Importance]++
		}
		
		// Collect unique categories
		if change.ChangeCategory != "" {
			categorySet[change.ChangeCategory] = true
		}
	}

	// Convert category set to sorted slice
	for category := range categorySet {
		summary.Categories = append(summary.Categories, category)
	}
	sort.Strings(summary.Categories)

	return summary
}

// convertToFieldDiffs converts Changes to legacy FieldDiff format
func (e *Engine) convertToFieldDiffs(changes []Change) []FieldDiff {
	fields := make([]FieldDiff, len(changes))
	
	for i, change := range changes {
		var changeType ChangeType
		switch change.Op {
		case OpAdd:
			changeType = ChangeTypeAdded
		case OpRemove:
			changeType = ChangeTypeRemoved
		case OpReplace:
			changeType = ChangeTypeModified
		}
		
		fields[i] = FieldDiff{
			Path:     change.Path,
			OldValue: change.Before,
			NewValue: change.After,
			Type:     changeType,
		}
	}
	
	return fields
}

// compareStringMaps compares two string maps
func (e *Engine) compareStringMaps(basePath string, map1, map2 map[string]string) []Change {
	// Convert string maps to interface maps for unified comparison
	iMap1 := make(map[string]interface{}, len(map1))
	iMap2 := make(map[string]interface{}, len(map2))
	for k, v := range map1 {
		iMap1[k] = v
	}
	for k, v := range map2 {
		iMap2[k] = v
	}
	return e.compareMaps(basePath, iMap1, iMap2)
}

// compareMaps compares two generic maps
func (e *Engine) compareMaps(basePath string, map1, map2 map[string]interface{}) []Change {
	changes := make([]Change, 0)

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
			changes = append(changes, e.createChange(OpRemove, path, val1, nil))
		} else if !exists1 && exists2 {
			changes = append(changes, e.createChange(OpAdd, path, nil, val2))
		} else if !e.deepEqual(val1, val2) {
			// Check if both are maps - recurse
			if m1, ok1 := val1.(map[string]interface{}); ok1 {
				if m2, ok2 := val2.(map[string]interface{}); ok2 {
					changes = append(changes, e.compareMaps(path, m1, m2)...)
					continue
				}
			}

			changes = append(changes, e.createChange(OpReplace, path, val1, val2))
		}
	}

	return changes
}

// createChange creates a Change object with semantic information
func (e *Engine) createChange(op OpType, path string, before, after interface{}) Change {
	// Determine value for type inspection
	value := after
	if value == nil {
		value = before
	}

	change := Change{
		Op:             op,
		Path:           path,
		PathTokens:     e.pathToTokens(path),
		Before:         before,
		After:          after,
		ValueType:      getValueType(value),
		SemanticType:   classifySemanticType(path),
		ChangeCategory: classifyChangeCategory(path),
	}

	change.Importance = determineImportance(path, change.SemanticType)
	change.Flags = determineFlags(path, change.SemanticType)

	return change
}

// pathToTokens converts a dot-notation path to typed tokens
func (e *Engine) pathToTokens(path string) []PathToken {
	if path == "" {
		return []PathToken{}
	}

	parts := strings.Split(path, ".")
	tokens := make([]PathToken, 0, len(parts))

	for _, part := range parts {
		// Try to parse as integer (array index)
		if idx, err := strconv.Atoi(part); err == nil {
			tokens = append(tokens, idx)
		} else {
			tokens = append(tokens, part)
		}
	}

	return tokens
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
