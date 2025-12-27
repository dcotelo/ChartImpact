# Cloudflare Pages Deployment

## Configuration

### Build Settings

- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `frontend`
- **Node.js version**: 18 (specified in `.node-version`)

### Environment Variables

Add the following environment variable in Cloudflare Pages settings:

```
NEXT_PUBLIC_API_URL=https://your-backend-api.example.com
```

Replace `https://your-backend-api.example.com` with your actual backend API URL.

## Architecture Changes

To support Cloudflare Pages:

1. **Direct backend calls**: The frontend now calls the backend API directly instead of using frontend API routes as middleware

2. **No edge functions needed**: All API logic runs in the Go backend, making the frontend a pure static site

3. **Removed standalone output**: The `output: 'standalone'` configuration has been removed from `next.config.js` as it's Docker-specific

## Backend Requirements

Your Go backend must be deployed and accessible from the internet. It should expose:

- `POST /api/compare` - Compare two chart versions
- `POST /api/versions` - Fetch available tags and branches from a git repository

Both endpoints are already implemented in the backend.

## Deployment Steps

1. **Deploy Backend First**: Ensure your Go backend is deployed and accessible (e.g., on a VPS, Cloud Run, etc.)

2. **Create Cloudflare Pages Project**:
   - Go to Cloudflare Dashboard → Workers & Pages
   - Click "Create application" → "Pages"
   - Connect your Git repository
   - Select the `frontend` directory as root
   - Use the build settings above

3. **Configure Environment Variables**:
   - Add `NEXT_PUBLIC_API_URL` pointing to your backend

4. **Deploy**: Push to your main branch or trigger manual deployment

## Testing

After deployment, test:

1. Health check: Visit your Pages URL
2. Versions endpoint: Try fetching versions for a repository
3. Compare endpoint: Compare two chart versions

## Rollback to Docker

If you need to revert to Docker deployment:

1. Add back to `next.config.js`: `output: 'standalone'`
2. Optionally restore frontend API routes from git history if you want the middleware layer
