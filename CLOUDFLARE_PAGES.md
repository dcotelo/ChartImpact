# Cloudflare Pages Deployment Guide

## Build Configuration

When setting up the project in Cloudflare Pages:

### Build Settings
- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `frontend`
- **Node version**: 20 (automatically detected from .node-version)

### ⚠️ Important: Deploy Command
**DO NOT** specify a custom deploy command. Leave it empty or use the default.
Cloudflare Pages automatically handles Next.js deployment after the build completes.

### Environment Variables

Add these in Cloudflare Pages dashboard (Settings > Environment variables):

```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

Replace `https://your-backend-api.com` with your deployed backend URL.

## Important Notes

1. **Dual Deployment Support**: 
   - The codebase supports both Docker Compose (local/self-hosted) and Cloudflare Pages
   - `next.config.js` automatically detects the environment:
     - Docker: Uses `output: 'standalone'` (set via `DOCKER_BUILD=true`)
     - Cloudflare: Uses default Next.js output
   - API routes use `edge` runtime on Cloudflare, `nodejs` runtime in Docker

2. **API Routes**: 
   - `/api/compare` automatically adapts runtime based on platform
   - `/api/versions` uses Node.js runtime (requires child_process for git operations)
   
3. **Backend Deployment**: 
   The Go backend must be deployed separately. Recommended platforms:
   - Fly.io (recommended for containerized apps)
   - Railway
   - Render
   - AWS ECS / Google Cloud Run

3. **CORS Configuration**:
   Update your backend's CORS settings to allow requests from your Cloudflare Pages domain:
   ```
   CORS_ALLOWED_ORIGINS=https://your-app.pages.dev,https://your-custom-domain.com
   ```

## Deployment Steps

1. Push your code to GitHub/GitLab
2. Go to Cloudflare Dashboard > Pages
3. Click "Create a project"
4. Connect your Git repository
5. Configure build settings (see above)
6. Add environment variables
7. Click "Save and Deploy"

## Post-Deployment

After deployment:
1. Test the `/api/compare` endpoint
2. Test the `/api/versions` endpoint
3. Verify CORS is working correctly
4. Monitor build logs for any issues

## Troubleshooting

- **API routes not working**: Check that environment variables are set correctly
- **CORS errors**: Verify backend CORS_ALLOWED_ORIGINS includes your Pages domain
- **Build failures**: Check build logs in Cloudflare dashboard
