# Impact Measurement Methodology

This document describes how ChartImpact measures and categorizes the impact of Helm chart changes to help teams make informed deployment decisions.

## Overview

ChartImpact employs a **risk-first, clarity-focused approach** to analyzing Helm chart changes. The system automatically analyzes differences between chart versions and surfaces potential impacts on **availability** and **security**, presenting them as contextual risk signals rather than blocking checks.

## Core Philosophy

ChartImpact follows these principles when measuring impact:

1. **Clarity over Judgment** - Provide clear information without imposing automated enforcement
2. **Risk Awareness** - Surface potential issues early in the decision-making process
3. **Contextual Explanations** - Every risk signal includes why it matters
4. **No False Certainty** - Present likelihood and context, not definitive verdicts

## Impact Categories

ChartImpact categorizes all detected changes into three primary impact categories:

### 1. Availability Impact

Changes that affect application uptime, accessibility, or operational stability:

**Resource Types Monitored:**
- `Deployment` - Application workload controllers
- `StatefulSet` - Stateful application controllers
- `DaemonSet` - Node-level workload controllers
- `Service` - Network service definitions

**Key Changes Detected:**
- **Replica count changes** - Scaling up or down affects redundancy
- **Update strategy changes** - Rollout behavior modifications
- **Service port changes** - Port modifications may break connectivity
- **Service type changes** - Exposure method modifications (ClusterIP, LoadBalancer, etc.)
- **Resource requests/limits** - Affects scheduling and performance
- **Resource addition/removal** - New or deleted availability-critical resources

### 2. Security Impact

Changes that affect access control, network security, or security posture:

**Resource Types Monitored:**
- `NetworkPolicy` - Pod-to-pod communication rules
- `ServiceAccount` - Pod identity and authentication
- `Role` / `ClusterRole` - RBAC permission definitions
- `RoleBinding` / `ClusterRoleBinding` - RBAC permission assignments
- `Secret` - Sensitive data storage

**Key Changes Detected:**
- **NetworkPolicy modifications** - Pod communication rule changes
- **RBAC permission changes** - Access control modifications
- **ServiceAccount token mounting** - Authentication mechanism changes
- **Security context changes** - Pod security settings
- **Resource addition/removal** - New or deleted security-sensitive resources

### 3. Other Changes

Changes that don't directly fall into availability or security categories but may still be significant:

**Examples:**
- Container image updates
- ConfigMap modifications
- Label and annotation changes
- Volume configuration changes
- Environment variable changes

## Risk Levels

Each detected change is assigned a risk level based on its potential impact:

### High Risk (🔴)

**Definition:** Changes with significant potential to disrupt service or compromise security.

**Examples:**
- Decreasing replica count (reduces redundancy)
- Removing availability-critical resources
- Service port or type changes
- NetworkPolicy modifications
- RBAC permission changes

**User Guidance:** "Review before deploying"

### Medium Risk (🟡)

**Definition:** Changes that require attention but are less likely to cause immediate issues.

**Examples:**
- Increasing replica count
- Adding new availability-critical or security-sensitive resources
- Update strategy modifications
- ServiceAccount token mount changes
- Container image changes
- Resource requests/limits changes

**User Guidance:** "Consider reviewing"

### Low Risk (🟢)

**Definition:** Minor changes unlikely to cause operational issues.

**Examples:**
- Label modifications
- Annotation changes
- Minor configuration updates
- Documentation changes

**User Guidance:** Changes noted but minimal review needed

## Overall Verdict

ChartImpact provides an overall verdict for each comparison based on aggregated risk signals:

### Verdict Levels

1. **High-Risk** (⚠️)
   - One or more high-risk changes detected
   - Message: "Review before deploying"
   - Description: "This upgrade contains high-risk changes affecting availability or security."

2. **Medium-Risk** (⚡)
   - One or more medium-risk changes, no high-risk changes
   - Message: "Consider reviewing"
   - Description: "This upgrade contains changes that may affect your deployment."

3. **Low-Risk** (✓)
   - Only low-risk changes detected
   - Message: "Low risk upgrade"
   - Description: Summarizes total changes and notes minimal impact

4. **No Changes** (✓)
   - No differences detected
   - Message: "No changes detected"
   - Description: "The two versions are identical. No differences found in the rendered Helm templates."

## Technical Implementation

### Backend: Semantic Analysis

**Location:** `backend/internal/diff/semantic.go`

The backend diff engine performs initial semantic classification of changes:

**Semantic Types:**
- `container.image` - Container image changes
- `container.env` - Environment variable changes
- `workload.replicas` - Replica count changes
- `resources.cpu` / `resources.memory` - Resource limits/requests
- `service.port` - Service port configurations
- `security.context` - Security context settings
- `security.serviceAccount` - ServiceAccount configurations
- `metadata.label` / `metadata.annotation` - Metadata changes

**Change Categories:**
- `resources` - CPU/memory limits and requests
- `workload` - Deployments, containers, replicas
- `networking` - Services, ingress, ports
- `security` - Security contexts, RBAC, secrets
- `config` - ConfigMaps, environment variables
- `metadata` - Labels, annotations, names
- `storage` - Volumes, PVCs

**Importance Levels:**
- `high` - Image, replicas, security context changes
- `medium` - Resource limits, environment variables, ports
- `low` - Labels, annotations

**Semantic Flags:**
- `runtime-impact` - Affects running workloads
- `rollout-trigger` - Triggers pod restart/rollout
- `scaling-change` - Replica count modification
- `breaking-change` - Potentially breaking change
- `security-impact` - Security implications
- `networking-change` - Network configuration change

### Frontend: Risk Assessment

**Location:** `frontend/lib/risk-assessment.ts`

The frontend performs detailed risk assessment and generates user-facing risk signals:

**Assessment Logic:**
1. **Resource-Level Analysis:**
   - Identify resource type (availability-critical, security-sensitive, or other)
   - Detect resource additions/removals
   - Assign appropriate risk level and category

2. **Field-Level Analysis:**
   - Examine each field change within modified resources
   - Apply specific rules for known impactful fields
   - Generate contextual descriptions

3. **Signal Aggregation:**
   - Collect all risk signals
   - Count by risk level (high, medium, low)
   - Determine overall verdict

**Risk Signal Structure:**
```typescript
{
  resource: string;        // e.g., "Deployment/api"
  kind: string;            // e.g., "Deployment"
  level: 'high' | 'medium' | 'low';
  category: 'availability' | 'security' | 'other';
  title: string;           // Short summary
  description: string;     // Contextual explanation
  field?: string;          // Specific field path
  oldValue?: any;          // Previous value
  newValue?: any;          // New value
}
```

### Structured Diff Format (v1 Spec)

**Location:** `backend/internal/diff/types.go`, `backend/internal/diff/V1_SPEC_IMPLEMENTATION.md`

ChartImpact uses a comprehensive structured diff format that includes:

**DiffResult Structure:**
```json
{
  "metadata": {
    "engineVersion": "1.0.0",
    "compareId": "uuid",
    "generatedAt": "RFC3339 timestamp",
    "inputs": { /* version details */ }
  },
  "resources": [
    {
      "identity": { /* resource identification */ },
      "changeType": "added|removed|modified",
      "changes": [ /* field-level changes */ ],
      "summary": { /* resource-level statistics */ }
    }
  ],
  "stats": {
    "resources": { "added": 0, "removed": 0, "modified": 0 },
    "changes": { "total": 0 }
  }
}
```

Each change includes:
- **Operation type** (add/remove/replace)
- **Path** (RFC6901 JSON Pointer)
- **Before/After values**
- **Semantic type** (backend classification)
- **Change category** (high-level grouping)
- **Importance** (backend hint)
- **Flags** (semantic hints)

## UI Presentation

### Impact Summary Component

**Location:** `frontend/components/ImpactSummary.tsx`

The Impact Summary component presents risk signals in a user-friendly format:

1. **Verdict Banner**
   - Overall risk level with icon
   - Clear message and description
   - Risk count summary (high/medium/low)

2. **Availability Impact Section**
   - Grouped availability-related signals
   - Expanded by default
   - Each signal shows resource, title, description, and risk level

3. **Security Impact Section**
   - Grouped security-related signals
   - Expanded by default
   - Same detailed format as availability section

4. **Other Changes Section**
   - Grouped miscellaneous changes
   - Collapsed by default
   - Lower priority but still documented

### Risk Signal Cards

Each risk signal is displayed as a card with:
- **Icon** - Visual risk level indicator (🔴 🟡 🟢)
- **Resource name** - "Kind/Name" format
- **Risk badge** - Color-coded level (HIGH, MEDIUM, LOW)
- **Title** - Brief description of the change
- **Description** - Contextual explanation of why it matters
- **Field path** - Specific field that changed (if applicable)
- **Value changes** - Before/after values (if applicable)

## Decision Support (Not Enforcement)

ChartImpact is explicitly designed to **support decisions, not make them**:

- ❌ **Does NOT block deployments** - No automated gates or enforcement
- ❌ **Does NOT judge "good" or "bad"** - Presents information objectively
- ❌ **Does NOT require approvals** - No workflow integration required
- ✅ **Does provide visibility** - Surfaces what's changing
- ✅ **Does explain impact** - Clarifies why changes matter
- ✅ **Does support collaboration** - Shareable URLs for team discussion
- ✅ **Does enable informed choices** - Teams decide based on their context

## Limitations and Considerations

### What ChartImpact Measures

- **Resource-level changes** - Additions, removals, modifications
- **Field-level changes** - Specific configuration changes
- **Semantic impact** - Kubernetes-aware analysis
- **Relative differences** - Between two specific versions

### What ChartImpact Does NOT Measure

- **Runtime behavior** - Cannot predict actual application behavior
- **Environment-specific issues** - Cluster capacity, network policies, etc.
- **Cumulative effects** - Multiple changes in sequence
- **Business impact** - User experience, revenue impact, etc.
- **Dependency compatibility** - External service dependencies
- **Performance impact** - Runtime performance characteristics

### False Positives and Negatives

**Possible False Positives:**
- Benign changes flagged as risky (e.g., increasing replicas during planned scaling)
- Test or development resources flagged as critical

**Possible False Negatives:**
- Application-specific breaking changes not covered by generic rules
- Indirect impacts from label changes affecting selectors
- Complex multi-resource dependencies

**Mitigation:**
- Review all changes in context of your specific deployment
- Use ChartImpact as one input among many
- Validate in non-production environments first

## Future Enhancements

Planned improvements to impact measurement:

1. **Configurable Risk Thresholds**
   - Team-defined criteria for what constitutes high/medium/low risk
   - Custom rules for specific resource types or fields

2. **Historical Analysis**
   - Track which changes actually caused issues
   - Learn from deployment history

3. **Environment-Specific Assessment**
   - Account for cluster capacity and constraints
   - Consider existing deployed state

4. **Dependency Analysis**
   - Understand relationships between resources
   - Flag cascading impacts

5. **Custom Annotations**
   - Allow teams to annotate resources with impact hints
   - Honor team-specific risk classifications

## References

- [Structured Diff Specification](../backend/internal/diff/V1_SPEC_IMPLEMENTATION.md)
- [Frontend Risk Assessment Code](../frontend/lib/risk-assessment.ts)
- [Backend Semantic Analysis](../backend/internal/diff/semantic.go)
- [Impact Summary UI Component](../frontend/components/ImpactSummary.tsx)

## Feedback

Impact measurement is an evolving area. We welcome feedback on:
- Missing risk scenarios
- False positives or negatives
- Unclear descriptions
- Suggested improvements

Please [open an issue](https://github.com/dcotelo/ChartImpact/issues/new) or [start a discussion](https://github.com/dcotelo/ChartImpact/discussions).
