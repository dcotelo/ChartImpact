# Diff Engine v1 Specification - Implementation Guide

This document describes the implementation of the comprehensive diff specification v1 in the ChartImpact backend.

## Overview

The v1 diff specification provides a rich, structured output designed explicitly to enable a frontend-first experience. It focuses on preserving maximum information about changes while remaining deterministic and stable.

## Key Features

### 1. Metadata Block

Every diff result includes comprehensive metadata for traceability:

```json
{
  "metadata": {
    "engineVersion": "1.0.0",
    "compareId": "uuid",
    "generatedAt": "RFC3339 timestamp",
    "inputs": {
      "left": { "source": "helm", "chart": "...", "version": "..." },
      "right": { "source": "helm", "chart": "...", "version": "..." }
    },
    "normalizationRules": ["normalizeDefaults"]
  }
}
```

**Purpose**: 
- Detect stale diff data
- Show tooltips about normalization rules
- Avoid mixing incompatible diff versions

### 2. Canonical Resource Identity

Each resource is uniquely identified by:

```json
{
  "identity": {
    "apiVersion": "apps/v1",
    "kind": "Deployment",
    "name": "api",
    "namespace": "default",
    "uid": null
  }
}
```

**Purpose**: Grouping, filtering, and linking resources

### 3. Field-Level Change Model

Each change provides comprehensive information:

```json
{
  "op": "replace",
  "path": "spec.replicas",
  "pathTokens": ["spec", "replicas"],
  "before": 2,
  "after": 3,
  "valueType": "number",
  "semanticType": "workload.replicas",
  "changeCategory": "workload",
  "importance": "high",
  "flags": ["scaling-change", "runtime-impact"]
}
```

**Key Fields**:
- `op`: JSON Patch-style operation (add/remove/replace)
- `path`: RFC6901 JSON Pointer for searching and filtering
- `pathTokens`: Typed path representation (strings + integers)
- `semanticType`: Kubernetes-aware classification
- `changeCategory`: High-level grouping
- `importance`: Backend hint for severity (low/medium/high)
- `flags`: Semantic hints (runtime-impact, rollout-trigger, etc.)

### 4. Semantic Classification

The engine automatically classifies changes:

**Semantic Types**:
- `container.image` - Container image changes
- `workload.replicas` - Replica count changes
- `resources.cpu` / `resources.memory` - Resource limits/requests
- `service.port` - Service port configurations
- `metadata.label` / `metadata.annotation` - Metadata changes

**Categories**:
- `workload` - Deployments, StatefulSets, etc.
- `networking` - Services, Ingresses
- `security` - Security contexts, service accounts
- `resources` - CPU/memory limits and requests
- `config` - ConfigMaps, environment variables
- `storage` - Volumes, PVCs
- `metadata` - Labels, annotations

**Importance Levels**:
- `high` - Image changes, replica changes, security contexts
- `medium` - Resource limits, environment variables, ports
- `low` - Labels, annotations

### 5. Resource-Level Summary

Each resource includes a derived summary:

```json
{
  "summary": {
    "totalChanges": 3,
    "byImportance": {
      "high": 2,
      "medium": 1
    },
    "categories": ["resources", "workload"]
  }
}
```

**Purpose**: Frontend can display quick summaries without recomputation

### 6. Stats Block

Top-level statistics for the entire diff:

```json
{
  "stats": {
    "resources": {
      "added": 1,
      "removed": 0,
      "modified": 3
    },
    "changes": {
      "total": 27
    }
  }
}
```

## Determinism Guarantees

The engine guarantees:
1. **Stable ordering**: Resources sorted by (kind, namespace, name)
2. **Change ordering**: Changes sorted by path
3. **Reproducibility**: Same input → byte-identical output (excluding compareId and generatedAt)

## Backward Compatibility

The implementation maintains full backward compatibility:

1. **Legacy Summary**: Old `summary` field is still populated
2. **Legacy Fields**: ResourceDiff includes both new `identity` and old flat fields
3. **Raw Output**: Text-based diff output is still available in the `raw` field
4. **API Response**: New `structuredDiff` field added alongside legacy `diff` field

## API Integration

### Request

POST `/api/compare` with:
```json
{
  "repository": "https://github.com/org/repo.git",
  "chartPath": "charts/my-chart",
  "version1": "1.2.3",
  "version2": "1.2.4",
  "ignoreLabels": false
}
```

### Response

```json
{
  "success": true,
  "diff": "... legacy text output ...",
  "structuredDiff": {
    "metadata": { ... },
    "resources": [ ... ],
    "stats": { ... }
  },
  "version1": "1.2.3",
  "version2": "1.2.4"
}
```

## Frontend Usage Examples

### Filter by Category

```javascript
const workloadChanges = structuredDiff.resources
  .filter(r => r.changes.some(c => c.changeCategory === 'workload'));
```

### Filter by Importance

```javascript
const highImpactChanges = structuredDiff.resources
  .flatMap(r => r.changes)
  .filter(c => c.importance === 'high');
```

### Search by Path

```javascript
const imageChanges = structuredDiff.resources
  .flatMap(r => r.changes)
  .filter(c => c.path.includes('.image'));
```

### Group by Semantic Type

```javascript
const changesByType = structuredDiff.resources
  .flatMap(r => r.changes)
  .reduce((acc, change) => {
    const type = change.semanticType || 'unknown';
    acc[type] = acc[type] || [];
    acc[type].push(change);
    return acc;
  }, {});
```

### Display Quick Stats

```javascript
console.log(`Resources: ${structuredDiff.stats.resources.modified} modified`);
console.log(`Total Changes: ${structuredDiff.stats.changes.total}`);
```

## Testing

Comprehensive tests are provided in:
- `diff_test.go` - Core diff engine tests
- `v1_spec_test.go` - V1 specification compliance tests
- `structured_diff_test.go` - API integration tests

Run tests:
```bash
go test ./internal/diff/... -v
go test ./internal/service/... -v
```

## Example Output

See `example_v1_output.json` for a complete example of the structured diff format.

## Future Enhancements

The specification is designed to be extensible. Future additions might include:

1. **Array Diff Strategy**: Detailed array change tracking with `arrayDiff` field
2. **Custom Semantic Types**: Plugin system for custom classifications
3. **Change Dependencies**: Track relationships between changes
4. **Rollback Impact**: Estimate impact of reverting changes
5. **Golden Test Fixtures**: Version-controlled test cases for regression testing

## References

- RFC6901 (JSON Pointer): https://tools.ietf.org/html/rfc6901
- RFC7386 (JSON Merge Patch): https://tools.ietf.org/html/rfc7386
- Kubernetes API Conventions: https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md
