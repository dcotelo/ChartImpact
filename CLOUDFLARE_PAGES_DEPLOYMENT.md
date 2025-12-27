# Cloudflare Pages Deployment Guide

## Overview

This guide explains how to deploy the ChartImpact frontend to Cloudflare Pages while maintaining backward compatibility with Docker Compose deployment.

## Architecture

The frontend is a **static Next.js application** that communicates with a separate Go backend API:

```
┌─────────────────────┐         ┌──────────────────┐
│  Cloudflare Pages   │  HTTPS  │  Backend API     │
│  (Static Frontend)  ├────────►│  (Go Service)    │
│  Port 443           │         │  Port 8080       │
└─────────────────────┘         └──────────────────┘
```

## Build Configuration

The frontend uses a **unified Next.js configuration** (`next.config.js`) that supports both deployment methods through an environment variable:

### Static Export for Cloudflare Pages

When `CLOUDFLARE_PAGES=true`:

- **Build Command**: `npm run build:cloudflare`
- **Output Directory**: `out/`
- **Output Mode**: `export` (static HTML/CSS/JS)
- **Images**: Unoptimized for static export
- **Trailing Slashes**: Enabled for static hosting

### Standalone Build for Docker

When `CLOUDFLARE_PAGES` is not set (default):

- **Build Command**: `npm run build`
- **Output Directory**: `.next/`
- **Output Mode**: `standalone` (includes Node.js server)
- **Images**: Optimized
- **Trailing Slashes**: Disabled

## Deployment Methods

### Method 1: Cloudflare Pages (Recommended for Production)

#### Prerequisites

1. **Backend Deployment**: Deploy the Go backend to a cloud service (e.g., Cloud Run, AWS Lambda, etc.)
2. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)

#### Setup Steps

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Click "Create a project"
   - Connect your GitHub repository
   - Select the `ChartImpact` repository

2. **Configure Build Settings**
   ```
   Framework preset: Next.js
   Build command: npm run build:cloudflare
   Build output directory: frontend/out
   Root directory: frontend
   Node version: 18
   ```

3. **Set Environment Variables**
   In Cloudflare Pages → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
   CLOUDFLARE_PAGES=true
   NODE_VERSION=18
   ```
   
   > Note: `CLOUDFLARE_PAGES=true` enables static export mode in the build configuration.

4. **Deploy**
   - Push to your main branch for production deployment
   - Push to other branches for preview deployments

#### Branch Deployments

- **Production**: Deploys from `main` branch
- **Preview**: Automatic preview deployments for all other branches
- All deployments use the same build configuration

### Method 2: Docker Compose (Development & Self-Hosted)

The existing Docker Compose setup remains unchanged and fully compatible:

```bash
# Start both frontend and backend
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

**No changes required** - the Docker Compose workflow continues to work as before.

## Build Commands

The `package.json` includes build commands for both deployment methods:

### For Cloudflare Pages (Static Export)
```bash
npm run build:cloudflare
```
- Sets `CLOUDFLARE_PAGES=true` environment variable
- Uses `next.config.js` in export mode
- Outputs to `out/` directory
- Creates static HTML/CSS/JS files
- **No server runtime required**

### For Docker (Standalone Build)
```bash
npm run build
```
- Uses `next.config.js` in standalone mode (default)
- Outputs to `.next/` directory
- Includes Node.js server
- **Requires Node.js runtime**

## Environment Configuration

### Cloudflare Pages

Set in Cloudflare Pages dashboard:
```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Docker Compose

Set in `docker-compose.yml` (already configured):
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Local Development

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Output Directory Structure

### Cloudflare Pages Output (`out/`)

```
frontend/out/
├── index.html
├── demo/
│   └── index.html
├── _next/
│   └── static/
│       ├── chunks/
│       └── css/
└── [other static assets]
```

### Docker Output (`.next/`)

```
frontend/.next/
├── standalone/
│   ├── server.js
│   └── package.json
├── static/
└── [build artifacts]
```

## Testing Locally

### Test Static Build (Cloudflare Pages)

```bash
cd frontend

# Build for Cloudflare
npm run build:cloudflare

# Serve the static files
npx serve out

# Access at http://localhost:3000
```

### Test Docker Build

```bash
# From repository root
docker-compose up

# Access at http://localhost:3000
```

## Backward Compatibility

✅ **Docker Compose**: Works without any changes
- Same build command (`npm run build`)
- Same Dockerfile
- Same environment variables
- Same port mappings

✅ **CI/CD Workflows**: No breaking changes
- Existing GitHub Actions workflows continue to work
- Build artifacts remain in `.next/` for Docker builds

## Troubleshooting

### Issue: "API call failed" on Cloudflare Pages

**Solution**: Verify `NEXT_PUBLIC_API_URL` is set correctly in Cloudflare Pages environment variables.

### Issue: "Cannot find module" during static build

**Solution**: Ensure you're using `npm run build:cloudflare` command, not `npm run build`.

### Issue: Docker build fails after changes

**Solution**: The Docker configuration is unchanged. If you're having issues:
1. Ensure you're using `npm run build` (not `build:cloudflare`) in Docker
2. Verify `next.config.js` responds to the `CLOUDFLARE_PAGES` environment variable
3. Ensure `CLOUDFLARE_PAGES` is NOT set in your Docker environment

## API Route Compatibility

The Next.js API routes (`/api/compare`, `/api/versions`) are **not used** in static export mode:

- **Cloudflare Pages**: Frontend calls backend API directly via `NEXT_PUBLIC_API_URL`
- **Docker**: API routes exist but are bypassed (frontend still calls backend API)

This ensures **consistent behavior** across all deployment methods.

## Preview Deployments

Cloudflare Pages automatically creates preview deployments for:
- Pull requests
- Non-production branches

Each preview deployment:
- Uses the same build command
- Uses the same environment variables
- Has a unique URL (e.g., `feature-branch.chartimpact.pages.dev`)

**No special configuration needed** for preview vs. production deployments.

## Security Considerations

1. **CORS**: Ensure your backend API allows requests from Cloudflare Pages domain
2. **API URL**: Use HTTPS for production backend API
3. **Environment Variables**: Only use `NEXT_PUBLIC_*` prefix for client-side variables

## Next Steps

1. ✅ Deploy backend API to a cloud service
2. ✅ Configure Cloudflare Pages with correct environment variables
3. ✅ Test preview deployment on a feature branch
4. ✅ Verify production deployment on main branch
5. ✅ Confirm Docker Compose still works locally

## Support

For issues or questions:
- Backend deployment: See `backend/README.md`
- Frontend development: See `frontend/README.md`
- CI/CD: See `.github/workflows/README.md`
