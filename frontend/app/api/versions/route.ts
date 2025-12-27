import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface VersionsResponse {
  success: boolean;
  tags?: string[];
  branches?: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repository } = body;
    
    if (!repository) {
      return NextResponse.json<VersionsResponse>({
        success: false,
        error: 'Repository URL is required'
      }, { status: 400 });
    }

    // Validate repository URL format
    if (!repository.match(/^(https?:\/\/|git@)/)) {
      return NextResponse.json<VersionsResponse>({
        success: false,
        error: 'Invalid repository URL format'
      }, { status: 400 });
    }

    // Call backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    try {
      const response = await fetch(`${apiUrl}/api/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository }),
      });

      const data = await response.json() as VersionsResponse;
      
      if (!response.ok) {
        return NextResponse.json<VersionsResponse>({
          success: false,
          error: data.error || 'Failed to fetch versions from backend'
        }, { status: response.status });
      }

      return NextResponse.json<VersionsResponse>(data);
    } catch (error) {
      return NextResponse.json<VersionsResponse>({
        success: false,
        error: `Backend API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Versions fetch error:', error);
    return NextResponse.json<VersionsResponse>({
      success: false,
      error: error.message || 'Failed to fetch versions from repository'
    }, { status: 500 });
  }
}
