'use client';

export const runtime = 'edge';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ImpactSummaryComponent } from '@/components/ImpactSummary';
import { DiffExplorer } from '@/components/explorer/DiffExplorer';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { assessRisk } from '@/lib/risk-assessment';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';
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
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1f2937',
        padding: `${SPACING.xl} ${SPACING.md}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: BORDER_RADIUS.lg,
          padding: `${SPACING.lg} ${SPACING.xl}`,
          boxShadow: SHADOWS.xl,
          maxWidth: '500px',
          width: '100%',
        }}>
          <ProgressIndicator
            message="Loading stored analysis..."
            step={1}
            totalSteps={1}
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACING['2xl']} ${SPACING.xl}`,
        background: '#f8f9fa',
      }}>
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          padding: `${SPACING['2xl']} ${SPACING.xl}`,
          boxShadow: SHADOWS.lg,
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '56px',
            marginBottom: SPACING.lg,
          }}>⚠️</div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#dc2626',
            marginBottom: SPACING.md,
            margin: 0,
          }}>
            Failed to Load Analysis
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: SPACING.xl,
            lineHeight: 1.6,
          }}>
            {error}
          </p>
          <button
            onClick={handleNewComparison}
            style={{
              background: BRAND_COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: BORDER_RADIUS.md,
              padding: `${SPACING.sm} ${SPACING.lg}`,
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: SHADOWS.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = SHADOWS.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = SHADOWS.sm;
            }}
          >
            Start New Comparison
          </button>
        </div>
      </div>
    );
  }

  // Results state
  if (!result) {
    return null;
  }

  const expiresAt = metadata?.expiresAt ? new Date(metadata.expiresAt) : null;
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: `${SPACING.xl} ${SPACING.md}`,
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          padding: `${SPACING.lg} ${SPACING.xl}`,
          marginBottom: SPACING.lg,
          boxShadow: SHADOWS.md,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: SPACING.md,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm,
                marginBottom: '4px',
              }}>
                <h1 style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                }}>
                  Stored Analysis
                </h1>
                <span style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: BORDER_RADIUS.sm,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  📦 Permalink
                </span>
              </div>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: 0,
                marginBottom: SPACING.xs,
              }}>
                Stored: {metadata?.storedAt ? new Date(metadata.storedAt).toLocaleString() : 'Unknown'}
              </p>
              {isExpiringSoon && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: SPACING.xs,
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: BORDER_RADIUS.sm,
                  marginTop: SPACING.xs,
                }}>
                  ⏰ Expires soon: {expiresAt?.toLocaleDateString()}
                </div>
              )}
            </div>
            <div style={{
              display: 'flex',
              gap: SPACING.sm,
              alignItems: 'center',
            }}>
              <button
                onClick={handleRerun}
                style={{
                  background: 'white',
                  color: BRAND_COLORS.primary,
                  border: `1.5px solid ${BRAND_COLORS.primary}`,
                  borderRadius: BORDER_RADIUS.md,
                  padding: `${SPACING.sm} ${SPACING.md}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.xs,
                }}
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
                  background: copySuccess ? '#10b981' : 'white',
                  color: copySuccess ? 'white' : '#64748b',
                  border: `1.5px solid ${copySuccess ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: BORDER_RADIUS.md,
                  padding: `${SPACING.sm} ${SPACING.md}`,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.xs,
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
                style={{
                  background: BRAND_COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: BORDER_RADIUS.md,
                  padding: `${SPACING.sm} ${SPACING.md}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: SHADOWS.sm,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = SHADOWS.md;
                  e.currentTarget.style.background = BRAND_COLORS.primaryDark;
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

        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          boxShadow: SHADOWS.md,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <DiffExplorer result={result} />
        </div>
      </div>
    </div>
  );
}

export default function StoredAnalysisPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
      }}>
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          padding: SPACING.xl,
          boxShadow: SHADOWS.md,
          border: '1px solid #e5e7eb',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: SPACING.md,
            letterSpacing: '-0.01em',
          }}>
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
