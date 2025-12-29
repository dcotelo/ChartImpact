'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompareRequest, CompareResponse, ImpactSummary } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/api-config';
import { decodeComparisonFromURL, createShareableURL } from '@/lib/url-state';
import { assessRisk } from '@/lib/risk-assessment';
import { ImpactSummaryComponent } from '@/components/ImpactSummary';
import { DiffExplorer } from '@/components/explorer/DiffExplorer';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';

type ViewMode = 'summary' | 'explorer';

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [copySuccess, setCopySuccess] = useState(false);

  // Auto-execute comparison on mount
  useEffect(() => {
    const executeComparison = async () => {
      setLoading(true);
      setError(null);

      // Decode URL params
      const params = decodeComparisonFromURL(searchParams);
      
      if (!params) {
        setError('Invalid or missing parameters. Please provide repo, path, v1, and v2.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.compare, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CompareResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Comparison failed');
        }

        setResult(data);
        
        // Generate risk assessment if we have structured diff data
        if (data.structuredDiff && data.structuredDiff.resources) {
          const assessment = assessRisk(data.structuredDiff.resources);
          setSummary(assessment);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    executeComparison();
  }, [searchParams]);

  const handleCopyLink = async () => {
    const params = decodeComparisonFromURL(searchParams);
    if (!params) return;

    const shareableURL = createShareableURL(params as CompareRequest);
    
    try {
      await navigator.clipboard.writeText(shareableURL);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNewComparison = () => {
    router.push('/');
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.xl,
          boxShadow: SHADOWS.xl,
          maxWidth: '600px',
          width: '100%',
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: BRAND_COLORS.primary,
            marginBottom: SPACING.lg,
            textAlign: 'center',
          }}>
            Loading Analysis
          </h1>
          <ProgressIndicator
            message="Analyzing differences..."
            step={3}
            totalSteps={7}
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.xl,
          boxShadow: SHADOWS.xl,
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: SPACING.lg,
          }}>⚠️</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#e53e3e',
            marginBottom: SPACING.md,
          }}>
            Error Loading Analysis
          </h1>
          <p style={{
            color: '#4a5568',
            marginBottom: SPACING.xl,
            lineHeight: '1.5',
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
              padding: `${SPACING.md} ${SPACING.xl}`,
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = SHADOWS.lg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Start New Comparison
          </button>
        </div>
      </div>
    );
  }

  // Results state
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: SPACING.xl,
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
          boxShadow: SHADOWS.xl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: SPACING.md,
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: BRAND_COLORS.primary,
            margin: 0,
          }}>
            Analysis Results
          </h1>
          <div style={{
            display: 'flex',
            gap: SPACING.md,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={handleCopyLink}
              style={{
                background: copySuccess ? '#48bb78' : 'white',
                color: copySuccess ? 'white' : BRAND_COLORS.primary,
                border: `2px solid ${copySuccess ? '#48bb78' : BRAND_COLORS.primary}`,
                borderRadius: BORDER_RADIUS.md,
                padding: `${SPACING.sm} ${SPACING.lg}`,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.xs,
              }}
            >
              {copySuccess ? '✓ Copied!' : '🔗 Copy Link'}
            </button>
            <button
              onClick={handleNewComparison}
              style={{
                background: BRAND_COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: BORDER_RADIUS.md,
                padding: `${SPACING.sm} ${SPACING.lg}`,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = SHADOWS.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              New Comparison
            </button>
          </div>
        </div>

        {/* View Toggle */}
        {result && summary && (
          <div style={{
            background: 'white',
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md,
            marginBottom: SPACING.lg,
            boxShadow: SHADOWS.md,
            display: 'flex',
            gap: SPACING.sm,
          }}>
            <button
              onClick={() => setViewMode('summary')}
              style={{
                background: viewMode === 'summary' ? BRAND_COLORS.primary : 'transparent',
                color: viewMode === 'summary' ? 'white' : BRAND_COLORS.primary,
                border: `2px solid ${BRAND_COLORS.primary}`,
                borderRadius: BORDER_RADIUS.md,
                padding: `${SPACING.sm} ${SPACING.lg}`,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: 1,
              }}
            >
              Summary View
            </button>
            <button
              onClick={() => setViewMode('explorer')}
              style={{
                background: viewMode === 'explorer' ? BRAND_COLORS.primary : 'transparent',
                color: viewMode === 'explorer' ? 'white' : BRAND_COLORS.primary,
                border: `2px solid ${BRAND_COLORS.primary}`,
                borderRadius: BORDER_RADIUS.md,
                padding: `${SPACING.sm} ${SPACING.lg}`,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: 1,
              }}
            >
              Detailed Explorer
            </button>
          </div>
        )}

        {/* Results Content */}
        {viewMode === 'summary' && summary ? (
          <ImpactSummaryComponent 
            summary={summary}
            onViewExplorer={() => setViewMode('explorer')}
          />
        ) : null}

        {viewMode === 'explorer' && result ? (
          <div style={{
            background: 'white',
            borderRadius: BORDER_RADIUS.lg,
            boxShadow: SHADOWS.xl,
            overflow: 'hidden',
          }}>
            <DiffExplorer result={result} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.xl,
          boxShadow: SHADOWS.xl,
        }}>
          <ProgressIndicator
            message="Loading analysis page..."
            step={1}
            totalSteps={1}
          />
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
