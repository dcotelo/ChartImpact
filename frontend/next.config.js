/** @type {import('next').NextConfig} */

// Determine build mode from environment variable
// For Cloudflare Pages: set CLOUDFLARE_PAGES=true
// For Docker: no environment variable needed (default)
const isCloudflarePages = process.env.CLOUDFLARE_PAGES === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: isCloudflarePages ? 'export' : 'standalone',
  // Disable image optimization for static export
  images: {
    unoptimized: isCloudflarePages,
  },
  // Trailing slashes for better static hosting compatibility
  trailingSlash: isCloudflarePages,
  // Output directory
  ...(isCloudflarePages && { distDir: 'out' }),
}

module.exports = nextConfig

