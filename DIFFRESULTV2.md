# DiffResultV2 - Structured Diff Format for Explorer v2

## Overview

The backend now exposes structured diff data in the `structuredDiff` field of the `CompareResponse`. This enables advanced features such as:

- **Path-level filtering and search**: Filter changes by field path, semantic type, or category
- **Semantic grouping**: Group changes by workload, networking, security, resources, etc.
- **Importance-based highlighting**: Identify critical, high, medium, and low importance changes
- **Summary graphs and analytics**: Display aggregate statistics and change impact
- **Frontend-only interactions**: Filter, search, and visualize without re-computing diffs

## Explorer v2 Availability

The backend explicitly indicates whether structured diff data is available through the `structuredDiffAvailable` flag in the response:

```json
{
  "success": true,
  "structuredDiffAvailable": true,
  "structuredDiff": { ... }
}
```

### Frontend Behavior

The Explorer (v2) component intelligently handles structured diff availability:

1. **Backend provides structured diff**: Uses `result.structuredDiff` from the API response
2. **Demo mode**: When demo data is explicitly provided via the `diffData` prop, displays a "DEMO MODE" badge
3. **Fallback**: When structured diff is not available, displays a helpful message directing users to Classic view

### When is Structured Diff Available?

Structured diff is available when:
- The internal diff engine is enabled (default: `INTERNAL_DIFF_ENABLED=true`)
- The comparison completes successfully
- Both chart versions are successfully rendered

### Demo Mode

Visit `/demo` to see Explorer v2 in action with mock data. The demo showcases all features without requiring a backend comparison.

## Backend Implementation

The backend generates structured diff data using the internal diff engine (enabled by default via `INTERNAL_DIFF_ENABLED=true` environment variable).

### API Response Structure

```json
{
  "success": true,
  "diff": "... plain text diff for backward compatibility ...",
  "version1": "v1.0.0",
  "version2": "v1.1.0",
  "structuredDiffAvailable": true,
  "structuredDiff": {
    "metadata": {
      "engineVersion": "1.0.0",
      "compareId": "uuid-123",
      "generatedAt": "2024-01-01T00:00:00Z",
      "inputs": {
        "left": { "source": "helm", "chart": "myapp", "version": "1.0.0" },
        "right": { "source": "helm", "chart": "myapp", "version": "1.1.0" }
      },
      "normalizationRules": ["ignoreLabels"]
    },
    "resources": [
      {
        "identity": {
          "apiVersion": "apps/v1",
          "kind": "Deployment",
          "name": "myapp",
          "namespace": "default"
        },
        "changeType": "modified",
        "beforeHash": "abc123",
        "afterHash": "def456",
        "changes": [
          {
            "op": "replace",
            "path": ".spec.replicas",
            "pathTokens": ["spec", "replicas"],
            "before": 1,
            "after": 3,
            "valueType": "int",
            "semanticType": "workload.replicas",
            "changeCategory": "workload",
            "importance": "high",
            "flags": ["runtime-impact", "scaling-change"]
          }
        ],
        "summary": {
          "totalChanges": 1,
          "byImportance": { "high": 1 },
          "categories": ["workload"]
        }
      }
    ],
    "stats": {
      "resources": {
        "added": 0,
        "removed": 0,
        "modified": 1
      },
      "changes": {
        "total": 1
      }
    }
  }
}
```

## Frontend Types

The frontend includes TypeScript types matching the backend structure:

```typescript
import { DiffResultV2, ResourceDiffV2, ChangeV2 } from '@/lib/types';

interface CompareResponse {
  success: boolean;
  diff?: string;              // Plain text diff for Classic view
  structuredDiff?: DiffResultV2;  // Structured diff for Explorer v2
  version1?: string;
  version2?: string;
}
```

## Semantic Types

Changes are classified with semantic types to understand their meaning:

- **Container**: `container.image`, `container.env`, `container.command`
- **Workload**: `workload.replicas`, `workload.strategy`
- **Resources**: `resources.cpu`, `resources.memory`
- **Service**: `service.port`, `service.type`
- **Ingress**: `ingress.rule`, `ingress.host`
- **Security**: `security.context`, `security.serviceAccount`
- **Storage**: `storage.volume`, `storage.claim`
- **Metadata**: `metadata.label`, `metadata.annotation`

## Change Categories

Changes are grouped into high-level categories:

- **workload**: Deployments, StatefulSets, DaemonSets, Jobs
- **networking**: Services, Ingress, NetworkPolicy
- **security**: RBAC, ServiceAccounts, PodSecurityPolicy
- **resources**: Resource requests and limits
- **config**: ConfigMaps, Secrets
- **storage**: PersistentVolumes, StorageClasses
- **metadata**: Labels and annotations

## Importance Levels

Changes are tagged with importance levels:

- **critical**: Image changes, security context changes
- **high**: Replica changes, service port changes, resource limit changes
- **medium**: Resource request changes, environment variable changes
- **low**: Label and annotation changes

## Flags

Changes may have flags indicating their impact:

- `runtime-impact`: Affects running workloads
- `rollout-trigger`: Triggers pod rollout
- `scaling-change`: Changes replica count
- `breaking-change`: Potentially breaking change
- `security-impact`: Has security implications
- `networking-change`: Changes network configuration

## Demo Route

Visit `/demo` to see Explorer v2 in action with mock data. The demo showcases:

- **Metadata display**: Engine version, compare ID, versions
- **Statistics dashboard**: Added, modified, removed resources
- **Interactive filtering**: Filter by importance level and category
- **Resource navigation**: Browse changes by resource
- **Change details**: View before/after values with semantic context
- **Demo mode indicator**: Clear badge showing it's using demo data

The demo works without any backend dependency, allowing you to explore all Explorer v2 features immediately.

## How Explorer v2 Determines Data Source

The `DiffExplorer` component intelligently selects data in this priority order:

1. **Explicit demo data** (via `diffData` prop) - Shows "DEMO MODE" badge
2. **Backend structured diff** (from `result.structuredDiff`) - Normal mode
3. **No data available** - Shows blocking message with Classic view suggestion

This ensures Explorer v2 is always functional when data is available, whether from demo or backend.
- **Demo mode indicator**: Clear badge showing it's using demo data

The demo works without any backend dependency, allowing you to explore all Explorer v2 features immediately.

## How Explorer v2 Determines Data Source

The `DiffExplorer` component intelligently selects data in this priority order:

1. **Explicit demo data** (via `diffData` prop) - Shows "DEMO MODE" badge
2. **Backend structured diff** (from `result.structuredDiff`) - Normal mode
3. **No data available** - Shows blocking message with Classic view suggestion

This ensures Explorer v2 is always functional when data is available, whether from demo or backend.

## Usage Examples

### Filter by Importance

```typescript
const criticalChanges = response.structuredDiff?.resources
  .flatMap(r => r.changes || [])
  .filter(c => c.importance === 'critical');
```

### Group by Category

```typescript
const changesByCategory = response.structuredDiff?.resources
  .reduce((acc, resource) => {
    resource.changes?.forEach(change => {
      if (!acc[change.changeCategory]) {
        acc[change.changeCategory] = [];
      }
      acc[change.changeCategory].push(change);
    });
    return acc;
  }, {} as Record<string, ChangeV2[]>);
```

### Search by Path

```typescript
const imageChanges = response.structuredDiff?.resources
  .flatMap(r => r.changes || [])
  .filter(c => c.path.includes('.image') || c.semanticType === 'container.image');
```

### Filter by Flags

```typescript
const runtimeImpactChanges = response.structuredDiff?.resources
  .flatMap(r => r.changes || [])
  .filter(c => c.flags?.includes('runtime-impact'));
```

## Backward Compatibility

The structured diff is fully backward compatible:

- **Classic view**: Continues to work with plain text `diff` field
- **Optional field**: `structuredDiff` is optional, existing clients unaffected
- **No breaking changes**: All existing functionality preserved
- **Dual format**: Both plain text and structured formats returned

## Configuration

The internal diff engine is enabled by default. To configure:

```bash
# Backend .env file
INTERNAL_DIFF_ENABLED=true  # Enable structured diff (default: true)
DYFF_ENABLED=true           # Fallback to dyff if internal engine fails (default: true)
```

## Next Steps

To implement Explorer v2:

1. **Consume structured diff**: Update components to use `structuredDiff` field
2. **Build UI components**: Create resource browser, filter controls, importance indicators
3. **Add visualizations**: Charts, graphs, heatmaps based on stats and categories
4. **Implement search**: Full-text search across paths, semantic types, and values
5. **Enable export**: Export filtered views, specific resources, or categories

## References

- Frontend types: `frontend/lib/types.ts`
- Backend types: `backend/internal/models/types.go`
- Diff engine: `backend/internal/diff/`
- Demo route: `frontend/app/demo/page.tsx`
- Implementation guide: `backend/internal/diff/V1_SPEC_IMPLEMENTATION.md`
