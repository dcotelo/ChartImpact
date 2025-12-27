/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only use standalone output for Docker builds
  ...(process.env.DOCKER_BUILD === 'true' && { output: 'standalone' }),
}

module.exports = nextConfig

