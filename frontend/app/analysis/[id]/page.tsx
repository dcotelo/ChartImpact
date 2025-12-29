'use client';

export const runtime = 'edge';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ImpactSummaryComponent } from '@/components/ImpactSummary';
import { DiffExplorer } from '@/components/explorer/DiffExplorer';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { assessRisk } from '@/lib/risk-assessment';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';
import {
  pageContainerStyle,
  contentWrapperStyle,
  headerCardStyle,
  flexBetweenStyle,
  flexCenterStyle,
  buttonGroupStyle,
  gradientTitleStyle,
  badgeGrayStyle,
  warningBadgeStyle,
  subtextStyle,
  actionButtonStyle,
  secondaryActionButtonStyle,
  primaryActionButtonStyle,
  resultCardStyle,
  suspenseFallbackStyle,
  suspenseCardStyle,
  suspenseTitleStyle,
} from '@/lib/common-styles';
import type { CompareResponse, ImpactSummary, CompareRequest } from '@/lib/types';
import { buildAnalysisURL } from '@/lib/url-state';

interface StoredAnalysisResponse {
  success: boolean;
  comparison?: {
    compareId: string;
    repository: string;
    chartPath: string;
    version1: string;
    version2: string;
    structuredDiff: any;
    createdAt: string;
    expiresAt: string;
  };
  metadata?: {
    storedAt: string;
    expiresAt: string;
    isExpired: boolean;
    isDeduplicated: boolean;
    uncompressedSize: number;
    compressionRatio: number;
  };
  error?: string;
}

interface StoredAnalysisContentProps {
  id: string;
}

function StoredAnalysisContent({ id }: StoredAnalysisContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const loadStoredAnalysis = async () => {
      try {
        setLoading(true);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/analysis/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Analysis not found. It may have expired or been deleted.');
          }
          throw new Error(`Failed to load analysis: ${response.status}`);
        }
        
        const data: StoredAnalysisResponse = await response.json();
        
        if (!data.success || !data.comparison) {
          throw new Error(data.error || 'Failed to load stored analysis');
        }
        
        // Convert to CompareResponse format
        const compareResponse: CompareResponse = {
          success: true,
          structuredDiff: data.comparison.structuredDiff,
          structuredDiffAvailable: true,
          version1: data.comparison.version1,
          version2: data.comparison.version2,
        };
        
        setResult(compareResponse);
        setMetadata(data.metadata);
        
        // Generate risk assessment
        if (data.comparison.structuredDiff?.resources) {
          const assessment = assessRisk(data.comparison.structuredDiff.resources);
          setSummary(assessment);
        }
        
      } catch (err) {
        console.error('Failed to load stored analysis:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadStoredAnalysis();
  }, [id]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/analysis/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNewComparison = () => {
    router.push('/');
  };

  const handleRerun = () => {
    if (!result || !metadata) return;
    
    // Build URL with original parameters for re-execution
    const request: CompareRequest = {
      repository: metadata.repository || '',
      chartPath: metadata.chartPath || '',
      version1: result.version1 || '',
      version2: result.version2 || '',
    };
    
    const url = buildAnalysisURL(request);
    router.push(url);
  };

  // Loading state
  if (loading) {
    return <LoadingScreen message="Loading stored analysis..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorScreen
        title="Failed to Load Analysis"
        message={error}
        onAction={handleNewComparison}
        actionLabel="Start New Comparison"
      />
    );
  }

  // Results state
  if (!result) {
    return null;
  }

  const expiresAt = metadata?.expiresAt ? new Date(metadata.expiresAt) : null;
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

  return (
    <div style={pageContainerStyle}>
      <div style={contentWrapperStyle}>
        {/* Header */}
        <div style={headerCardStyle}>
          <div style={flexBetweenStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ ...flexCenterStyle, marginBottom: '4px' }}>
                <h1 style={gradientTitleStyle}>
                  Stored Analysis
                </h1>
                <span style={badgeGrayStyle}>
                  📦 Permalink
                </span>
              </div>
              <p style={subtextStyle}>
                Stored: {metadata?.storedAt ? new Date(metadata.storedAt).toLocaleString() : 'Unknown'}
              </p>
              {isExpiringSoon && (
                <div style={warningBadgeStyle}>
                  ⏰ Expires soon: {expiresAt?.toLocaleDateString()}
                </div>
              )}
            </div>
            <div style={buttonGroupStyle}>
              <button
                onClick={handleRerun}
                style={actionButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = BRAND_COLORS.primary;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = BRAND_COLORS.primary;
                }}
              >
                🔄 Re-run Fresh
              </button>
              <button
                onClick={handleCopyLink}
                style={{
                  ...secondaryActionButtonStyle,
                  ...(copySuccess && {
                    background: '#10b981',
                    color: 'white',
                    borderColor: '#10b981',
                  }),
                }}
                onMouseEnter={(e) => {
                  if (!copySuccess) {
                    e.currentTarget.style.borderColor = BRAND_COLORS.primary;
                    e.currentTarget.style.color = BRAND_COLORS.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copySuccess) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                {copySuccess ? '✓ Copied!' : '🔗 Share'}
              </button>
              <button
                onClick={handleNewComparison}
                style={primaryActionButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = SHADOWS.md;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = SHADOWS.sm;
                  e.currentTarget.style.background = BRAND_COLORS.primary;
                }}
              >
                New Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Results Layout */}
        {summary && (
          <div style={{ marginBottom: SPACING.xl }}>
            <ImpactSummaryComponent summary={summary} />
          </div>
        )}

        <div style={resultCardStyle}>
          <DiffExplorer result={result} />
        </div>
      </div>
    </div>
  );
}

export default function StoredAnalysisPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div style={suspenseFallbackStyle}>
        <div style={suspenseCardStyle}>
          <div style={suspenseTitleStyle}>
            Loading Stored Analysis
          </div>
          <ProgressIndicator
            message="Fetching stored comparison..."
            step={1}
            totalSteps={1}
          />
        </div>
      </div>
    }>
      <StoredAnalysisContent id={params.id} />
    </Suspense>
  );
}
