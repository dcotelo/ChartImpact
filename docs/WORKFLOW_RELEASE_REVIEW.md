# GitHub Actions Release Workflow Review

**Date**: December 28, 2025  
**Repository**: dcotelo/ChartImpact  
**Current Version**: 1.2.1

## Executive Summary

This document reviews the GitHub Actions workflows that implement the ChartImpact release process. The current setup uses a **unified versioning strategy** where frontend and backend share the same version number, despite being separate Docker images with independent deployment lifecycles.

**Key Finding**: The workflows are well-structured with good separation of concerns for CI/CD, but the release process exhibits **tight coupling** between frontend and backend that creates unnecessary friction and risk.

---

## Current Workflow Architecture

### 1. Release Please Workflow (`release-please.yml`)

**Trigger**: Push to `main` branch  
**Purpose**: Automated release PR creation and version bumping

```yaml
Key Configuration:
- Uses manifest-based config (monorepo aware)
- Single package at root level "."
- Unified version: 1.2.1 for entire project
- Updates frontend/package.json as "extra file"
```

**Observations**:
- ✅ Properly configured for monorepo structure
- ✅ Automated changelog generation
- ❌ **Coupling Point #1**: Single manifest entry means one version for everything
- ❌ **Coupling Point #2**: No component-level release detection
- ⚠️ Release-Please outputs include `backend--release_created` and `frontend--release_created`, but they're unused

### 2. Release Workflow (`release.yml`)

**Trigger**: Git tags matching `v*.*.*` pattern OR manual workflow_dispatch  
**Purpose**: Build, test, and publish release artifacts

**Workflow Structure**:
```
test-backend ──┐
               ├──► build-backend ──┐
test-frontend ─┤                    ├──► docker-release ──► create-release
               └──► build-frontend ─┘
```

**Critical Analysis**:

#### Trigger Mechanism
```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```
- ❌ **Coupling Point #3**: Single tag triggers BOTH frontend and backend releases
- ❌ **Pain Point #1**: No way to release only frontend or only backend
- ❌ **Pain Point #2**: A tag push re-releases both components even if only one changed

#### Test Stage (Parallel)
- ✅ Backend and frontend tests run independently
- ✅ Failures in one don't block the other's tests
- ⚠️ But both must pass for release to proceed

#### Build Stage (Parallel)
- ✅ Backend builds create platform-specific binaries (linux-amd64, linux-arm64)
- ✅ Frontend builds produce Next.js artifacts
- ✅ Artifacts uploaded independently
- ⚠️ Both components always built, regardless of what changed

#### Docker Release Stage (Sequential)
```yaml
needs: [build-backend, build-frontend]
```
- ❌ **Coupling Point #4**: Docker stage requires BOTH builds to succeed
- ❌ **Coupling Point #5**: Both images are ALWAYS built and pushed
- ❌ **Pain Point #3**: Single image failure blocks the other image
- ✅ Images tagged independently (ghcr.io/repo/backend, ghcr.io/repo/frontend)
- ✅ Proper semantic version tags applied

#### GitHub Release Creation
- ❌ **Coupling Point #6**: Single GitHub release for both components
- ⚠️ Only backend binaries attached to release (frontend artifacts not included)
- ❌ Release notes don't distinguish frontend vs backend changes

### 3. CI Workflow (`ci.yml`)

**Trigger**: Pull requests affecting backend/frontend paths  
**Purpose**: Validate changes before merge

**Workflow Structure**:
```
changes (path detection)
    ├──► test-backend (conditional)
    │       └──► build-backend
    └──► test-frontend (conditional)
            └──► build-frontend
                    └──► docker-build (on main only)
```

**Analysis**:
- ✅ **Best Practice**: Uses `dorny/paths-filter` for intelligent change detection
- ✅ Only runs tests/builds for components that changed
- ✅ Docker builds are conditional based on detected changes
- ✅ This demonstrates the capability exists but is NOT used in release workflow

**Key Insight**: The CI workflow proves the team can detect and handle component-level changes independently, but this capability is not leveraged during releases.

---

## Coupling Points Summary

| # | Location | Issue | Impact |
|---|----------|-------|--------|
| 1 | release-please-config.json | Single manifest entry | One version bump triggers both releases |
| 2 | release-please.yml | No component-level detection | Cannot release components independently |
| 3 | release.yml trigger | Single tag pattern | Tag push always releases both |
| 4 | release.yml dependencies | `needs: [build-backend, build-frontend]` | One component failure blocks other |
| 5 | release.yml docker stage | Always builds both images | Unnecessary rebuilds waste CI time |
| 6 | release.yml github release | Single release object | Cannot track component versions separately |

---

## Pain Points

### 1. **Unnecessary Releases**
**Scenario**: A frontend-only bug fix  
**Current Behavior**: 
- Version bumped to 1.2.2
- Tag v1.2.2 pushed
- BOTH backend and frontend Docker images rebuilt and pushed as v1.2.2
- Backend image is identical to v1.2.1 except for the version tag

**Impact**: 
- Wastes CI compute resources
- Creates identical Docker layers with different tags
- Makes rollback decisions harder ("Is backend 1.2.2 different from 1.2.1?")
- Clutters container registry with redundant images

### 2. **Blocked Releases**
**Scenario**: Backend tests fail, but frontend has critical security fix  
**Current Behavior**: 
- Cannot release frontend independently
- Must fix backend issues first OR temporarily skip backend tests
- Security fix deployment delayed by unrelated component

**Impact**:
- Slows down emergency fixes
- Couples release velocity to the slowest component
- Creates pressure to skip tests or merge incomplete work

### 3. **Unclear Rollback Scenarios**
**Scenario**: Need to rollback to previous version  
**Current Behavior**:
- Single version number (e.g., v1.2.1) represents BOTH components
- Unclear if rolling back to v1.2.0 is safe for both components
- Cannot rollback one component without affecting the other

**Impact**:
- Increased risk during incident response
- May force rollback of working component
- Requires manual Docker tag inspection to understand what changed

### 4. **Re-run Safety Issues**
**Scenario**: Workflow failed during docker-release step, needs re-run  
**Current Behavior**:
- Re-running workflow rebuilds and re-pushes BOTH images
- Docker layers may be rebuilt from scratch depending on cache state
- No idempotency guarantees

**Impact**:
- Wastes CI time on re-runs
- Risk of inconsistent artifacts if build environment changed
- No clear audit trail of what was actually released

### 5. **Workflow Clarity**
**Current Issue**: Looking at a workflow run, it's not immediately clear:
- Which component actually changed
- Why both images were released
- Whether this is a frontend-only, backend-only, or combined release

**Impact**:
- Harder to audit releases
- Confusion during incident investigation
- Onboarding friction for new team members

---

## Comparison: CI vs Release Workflow Philosophy

| Aspect | CI Workflow (ci.yml) | Release Workflow (release.yml) |
|--------|---------------------|--------------------------------|
| Change Detection | ✅ Uses path filters | ❌ No change detection |
| Conditional Execution | ✅ Only builds what changed | ❌ Always builds both |
| Docker Builds | ✅ Conditional on changes | ❌ Always builds both |
| Philosophy | **Optimize for efficiency** | **Optimize for simplicity** |

**Key Observation**: The CI workflow demonstrates that conditional, component-aware builds are already implemented and working. This capability could be extended to the release workflow.

---

## Release-Please Configuration Analysis

Current configuration (`release-please-config.json`):
```json
{
  "packages": {
    ".": {
      "release-type": "simple",
      "package-name": "chartimpact",
      "include-component-in-tag": false,
      "changelog-path": "CHANGELOG.md",
      "extra-files": ["frontend/package.json"]
    }
  }
}
```

**Issues**:
1. Single root package means unified versioning
2. `include-component-in-tag: false` prevents component-specific tags (e.g., `backend-v1.2.0`)
3. Frontend package.json updated as "extra file" rather than as independent component
4. Backend and frontend CHANGELOG.md files exist but are not actively used

**Unused Capability**: Release-Please outputs suggest multi-component support:
- `backend--release_created`
- `backend--tag_name`
- `frontend--release_created`
- `frontend--tag_name`

These outputs are generated but never consumed by downstream jobs.

---

## Security and Safety Considerations

### Current State
- ✅ Tests must pass before release
- ✅ Manual workflow_dispatch allows emergency releases
- ✅ Docker builds use cache for efficiency
- ✅ Multi-platform builds (amd64, arm64)

### Concerns
- ⚠️ No explicit component change tracking
- ⚠️ Workflow reruns rebuild everything
- ⚠️ No protection against releasing unchanged components
- ⚠️ Manual dispatch doesn't validate what changed

---

## Recommendations

### Option 1: Quick Wins (Minimal Changes)

These can be implemented immediately without major restructuring:

#### 1.1 Add Component Change Detection to Release Workflow
```yaml
# Add to release.yml
jobs:
  detect-changes:
    name: Detect Component Changes
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.check.outputs.backend }}
      frontend: ${{ steps.check.outputs.frontend }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need history for comparison
      
      - name: Detect changes since last release
        id: check
        run: |
          # Compare current tag with previous tag
          CURRENT_TAG="${{ github.ref_name }}"
          PREVIOUS_TAG=$(git describe --abbrev=0 --tags ${CURRENT_TAG}^ 2>/dev/null || echo "")
          
          if [ -z "$PREVIOUS_TAG" ]; then
            echo "backend=true" >> $GITHUB_OUTPUT
            echo "frontend=true" >> $GITHUB_OUTPUT
          else
            BACKEND_CHANGES=$(git diff --name-only ${PREVIOUS_TAG}..${CURRENT_TAG} | grep -E "^backend/" | wc -l)
            FRONTEND_CHANGES=$(git diff --name-only ${PREVIOUS_TAG}..${CURRENT_TAG} | grep -E "^frontend/" | wc -l)
            
            echo "backend=$([[ $BACKEND_CHANGES -gt 0 ]] && echo true || echo false)" >> $GITHUB_OUTPUT
            echo "frontend=$([[ $FRONTEND_CHANGES -gt 0 ]] && echo true || echo false)" >> $GITHUB_OUTPUT
          fi
```

Then make Docker builds conditional:
```yaml
- name: Build and push backend image
  if: needs.detect-changes.outputs.backend == 'true'
  uses: docker/build-push-action@v5
  # ... rest of config

- name: Build and push frontend image
  if: needs.detect-changes.outputs.frontend == 'true'
  uses: docker/build-push-action@v5
  # ... rest of config
```

**Benefits**:
- Prevents unnecessary Docker image rebuilds
- Reduces CI time and resource usage
- Makes workflow runs clearer about what changed
- No changes to versioning or tagging strategy

**Limitations**:
- Still uses unified versioning
- Still creates single GitHub release
- Doesn't solve independent release problem

#### 1.2 Improve Release Notes Clarity
Add a summary step that explicitly states what changed:
```yaml
- name: Generate release summary
  run: |
    echo "## Component Changes" > release_summary.md
    if [ "${{ needs.detect-changes.outputs.backend }}" == "true" ]; then
      echo "- ✅ Backend: v${{ github.ref_name }}" >> release_summary.md
    else
      echo "- ⏭️ Backend: No changes (still v${{ github.ref_name }})" >> release_summary.md
    fi
    if [ "${{ needs.detect-changes.outputs.frontend }}" == "true" ]; then
      echo "- ✅ Frontend: v${{ github.ref_name }}" >> release_summary.md
    else
      echo "- ⏭️ Frontend: No changes (still v${{ github.ref_name }})" >> release_summary.md
    fi
```

#### 1.3 Add Workflow Summary
Use GitHub Actions job summaries to make it clear what happened:
```yaml
- name: Update workflow summary
  run: |
    echo "### Release Summary" >> $GITHUB_STEP_SUMMARY
    echo "**Version**: ${{ github.ref_name }}" >> $GITHUB_STEP_SUMMARY
    echo "**Backend**: ${{ needs.detect-changes.outputs.backend == 'true' && '✅ Released' || '⏭️ Skipped' }}" >> $GITHUB_STEP_SUMMARY
    echo "**Frontend**: ${{ needs.detect-changes.outputs.frontend == 'true' && '✅ Released' || '⏭️ Skipped' }}" >> $GITHUB_STEP_SUMMARY
```

**Effort**: Low (1-2 hours)  
**Risk**: Very Low  
**Value**: Medium (improved clarity and efficiency)

---

### Option 2: Independent Component Releases (Larger Change)

This is a more comprehensive solution that requires configuration changes:

#### 2.1 Update Release-Please Configuration
```json
{
  "packages": {
    "backend": {
      "release-type": "simple",
      "package-name": "chartimpact-backend",
      "include-component-in-tag": true,
      "changelog-path": "backend/CHANGELOG.md"
    },
    "frontend": {
      "release-type": "node",
      "package-name": "chartimpact-frontend",
      "include-component-in-tag": true,
      "changelog-path": "frontend/CHANGELOG.md"
    }
  }
}
```

This creates independent versioning:
- Backend: `backend-v1.2.0`, `backend-v1.2.1`, etc.
- Frontend: `frontend-v1.3.0`, `frontend-v1.3.1`, etc.

#### 2.2 Update Release Workflow Trigger
```yaml
on:
  push:
    tags:
      - 'backend-v*.*.*'
      - 'frontend-v*.*.*'
```

#### 2.3 Add Component Detection from Tag
```yaml
jobs:
  detect-component:
    runs-on: ubuntu-latest
    outputs:
      component: ${{ steps.detect.outputs.component }}
      version: ${{ steps.detect.outputs.version }}
    steps:
      - name: Detect component from tag
        id: detect
        run: |
          TAG="${{ github.ref_name }}"
          if [[ $TAG == backend-v* ]]; then
            echo "component=backend" >> $GITHUB_OUTPUT
            echo "version=${TAG#backend-v}" >> $GITHUB_OUTPUT
          elif [[ $TAG == frontend-v* ]]; then
            echo "component=frontend" >> $GITHUB_OUTPUT
            echo "version=${TAG#frontend-v}" >> $GITHUB_OUTPUT
          fi
```

#### 2.4 Conditional Job Execution
```yaml
test-backend:
  needs: detect-component
  if: needs.detect-component.outputs.component == 'backend'
  # ... rest of job

test-frontend:
  needs: detect-component
  if: needs.detect-component.outputs.component == 'frontend'
  # ... rest of job
```

**Benefits**:
- ✅ True independent releases
- ✅ Component-specific version numbers
- ✅ Separate changelogs
- ✅ Can release one component without affecting the other
- ✅ Clear version history per component

**Limitations**:
- Requires migration from v1.2.1 to backend-v1.2.1 and frontend-v1.2.1
- More complex release-please setup
- May require updates to deployment scripts/tools
- Existing version tags need careful handling

**Effort**: Medium (4-8 hours)  
**Risk**: Medium (breaking change for version tracking)  
**Value**: High (solves core coupling issues)

---

### Option 3: Hybrid Approach (Recommended)

Combine the best of both approaches:

1. **Keep unified versioning for now** (v1.2.x) to avoid migration pain
2. **Implement change detection** (Option 1.1) to skip unnecessary builds
3. **Add workflow clarity** (Option 1.2, 1.3) to make releases transparent
4. **Prepare for future independent versioning** by:
   - Documenting the path to independent releases
   - Ensuring component-specific CHANGELOGs are maintained
   - Adding component tags (e.g., "backend: v1.2.1") to release notes

**Migration Path**:
```
Phase 1 (Now): Implement Quick Wins
    ↓
Phase 2 (Next Quarter): Evaluate if pain points persist
    ↓
Phase 3 (If needed): Migrate to independent versioning
```

**Rationale**:
- Delivers immediate value with minimal risk
- Keeps door open for independent releases later
- Allows team to validate if unified versioning is actually a problem
- Avoids premature optimization

---

## Rerun and Rollback Safety

### Current Issues

1. **Workflow Reruns**:
   - Rebuilds everything from scratch (minus Docker cache)
   - No detection of what already succeeded
   - Risk of inconsistent state if environment changed

2. **Rollback Scenarios**:
   - Must manually inspect Docker images to see what changed
   - Cannot rollback one component independently
   - Unclear which version to target

### Recommendations

#### For Reruns:
```yaml
# Add cache validation
- name: Check if image already exists
  id: check-image
  run: |
    if docker pull ghcr.io/${{ github.repository }}/backend:${{ github.ref_name }}; then
      echo "exists=true" >> $GITHUB_OUTPUT
    else
      echo "exists=false" >> $GITHUB_OUTPUT
    fi

- name: Build and push backend image
  if: steps.check-image.outputs.exists == 'false'
  # ... rest of config
```

#### For Rollbacks:
Add metadata labels to Docker images:
```yaml
- name: Build and push backend image
  uses: docker/build-push-action@v5
  with:
    labels: |
      org.opencontainers.image.version=${{ github.ref_name }}
      com.chartimpact.component=backend
      com.chartimpact.git-sha=${{ github.sha }}
      com.chartimpact.build-date=${{ steps.date.outputs.date }}
```

This allows querying image metadata to understand what changed.

---

## Next Steps

### Immediate Actions (This Sprint)

1. ✅ **Document current state** (this document)
2. 🎯 **Implement Quick Win 1.1**: Add change detection to release workflow
3. 🎯 **Implement Quick Win 1.2**: Improve release notes clarity
4. 🎯 **Implement Quick Win 1.3**: Add workflow summaries
5. 📊 **Measure impact**: Track CI time reduction and workflow clarity

### Short-term (Next Sprint)

1. Monitor release patterns:
   - How often do both components change together?
   - How often is one component released alone?
   - Are there many "unnecessary release" scenarios?

2. Gather team feedback:
   - Is unified versioning causing real pain?
   - Are rollback scenarios confusing?
   - Do deployment teams have concerns?

3. Decision point: Independent versioning needed?

### Long-term (If Independent Versioning Chosen)

1. Plan migration path from v1.x.x to component-v1.x.x
2. Update documentation and deployment guides
3. Implement Option 2 (Independent Component Releases)
4. Create runbook for rollback scenarios

---

## Conclusion

The current release workflow is **functional but tightly coupled**. The unified versioning strategy is intentional (based on git history), but creates friction when components change independently.

**Key Findings**:
- ✅ Workflows are well-structured and secure
- ✅ CI workflow demonstrates change detection capability
- ❌ Release workflow always builds/releases both components
- ❌ No clear path for component-independent releases
- ⚠️ Rollback scenarios are unclear

**Recommended Approach**: Start with Quick Wins (Option 1) to improve efficiency and clarity, then evaluate if independent versioning (Option 2) is needed based on real-world pain points.

**Estimated Impact of Quick Wins**:
- 30-50% reduction in unnecessary Docker builds
- Clearer workflow runs and release notes
- Better audit trail for what changed
- Foundation for future independent releases if needed

The team should implement Quick Wins immediately and monitor for 1-2 release cycles before deciding on larger changes.
