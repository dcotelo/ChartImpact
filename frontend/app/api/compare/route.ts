import { NextRequest, NextResponse } from 'next/server';
import { CompareRequest, CompareResponse } from '@/lib/types';

// Use edge runtime for Cloudflare Pages, nodejs for Docker/local
// Cloudflare Pages: edge runtime provides better performance
// Docker/Local: nodejs runtime is more compatible
export const runtime = process.env.CLOUDFLARE_PAGES ? 'edge' : 'nodejs';
export const maxDuration = 120; // 2 minutes max

export async function POST(request: NextRequest) {
  try {
    const body: CompareRequest = await request.json();
    
    // Validate inputs
    if (!body.repository || !body.chartPath || !body.version1 || !body.version2) {
      return NextResponse.json<CompareResponse>({
        success: false,
        error: 'Missing required fields: repository, chartPath, version1, version2\n\n' +
               'For monorepo structures, use chart paths like:\n' +
               '  - charts/<chart-name> (e.g., charts/datadog)\n' +
               '  - chart/<chart-name>\n' +
               '  - <chart-name> (if chart is at repository root)'
      }, { status: 400 });
    }

    // Validate repository URL format
    if (!body.repository.match(/^(https?:\/\/|git@)/)) {
      return NextResponse.json<CompareResponse>({
        success: false,
        error: 'Invalid repository URL format. Please use:\n' +
               '  - HTTPS: https://github.com/user/repo.git\n' +
               '  - SSH: git@github.com:user/repo.git'
      }, { status: 400 });
    }

    // Validate chart path format
    if (body.chartPath.trim() === '') {
      return NextResponse.json<CompareResponse>({
        success: false,
        error: 'Chart path cannot be empty. For monorepo structures, specify the path like:\n' +
               '  - charts/datadog\n' +
               '  - charts/datadog-operator\n' +
               '  - chart/my-chart'
      }, { status: 400 });
    }

    // Make API call to backend service
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${apiUrl}/api/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository: body.repository,
        chartPath: body.chartPath,
        version1: body.version1,
        version2: body.version2,
        valuesFile: body.valuesFile,
        valuesContent: body.valuesContent,
        ignoreLabels: body.ignoreLabels
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend comparison failed');
    }

    const result = await response.json();

    return NextResponse.json<CompareResponse>({
      success: true,
      diff: result.diff,
      version1: body.version1,
      version2: body.version2,
      structuredDiff: result.structuredDiff,
      structuredDiffAvailable: result.structuredDiffAvailable,
      statistics: result.statistics
    });

  } catch (error: any) {
    console.error('Comparison error:', error);
    return NextResponse.json<CompareResponse>({
      success: false,
      error: error.message || 'Failed to compare Helm chart versions'
    }, { status: 500 });
  }
}

