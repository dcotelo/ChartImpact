import { NextRequest, NextResponse } from 'next/server';

// Cloudflare Pages requires edge runtime
// Note: This endpoint is not fully functional on Cloudflare edge runtime
// as it requires Node.js features (child_process, fs). Consider moving
// this logic to your Go backend for production use.
export const runtime = 'edge';
export const maxDuration = 60; // 1 minute max

interface VersionsResponse {
  success: boolean;
  tags?: string[];
  branches?: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  // This endpoint requires Node.js runtime features not available on Cloudflare edge
  // Return error message directing users to use backend endpoint instead
  return NextResponse.json({
    success: false,
    error: 'This endpoint is not available on Cloudflare Pages. Please use the backend API endpoint for version fetching, or use Docker deployment for full functionality.'
  }, { status: 501 });
}

