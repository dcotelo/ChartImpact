# Release Workflow Changes

## What Changed

The release workflow (`.github/workflows/release.yml`) now includes change detection to avoid rebuilding Docker images for unchanged components.

### New Job: `detect-changes`

Compares the current release tag with the previous tag to determine which components changed:
- Outputs: `backend` (true/false), `frontend` (true/false)
- Uses `git diff` to check for changes in `backend/` and `frontend/` directories

### Conditional Execution

All jobs now depend on the `detect-changes` outputs:
- `test-backend`: Runs only if backend changed
- `test-frontend`: Runs only if frontend changed  
- `build-backend`: Runs only if backend changed
- `build-frontend`: Runs only if frontend changed
- Docker images: Built and pushed only for changed components

### Enhanced Output

- Workflow summaries show which components changed
- Release notes indicate which components were updated
- Skip messages logged for unchanged components

## Impact

- Avoids unnecessary Docker builds when only one component changes
- Saves CI time (5-10 minutes per single-component release)
- Clearer visibility into what was actually released
- No changes to versioning strategy or release process
