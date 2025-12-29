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

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('Initializing...');
  const [progressStep, setProgressStep] = useState<number>(0);
  const [progressTotal] = useState<number>(7);

  // Auto-execute comparison on mount with progress tracking
  useEffect(() => {
    const executeComparison = async () => {
      setLoading(true);
      setError(null);
      setProgressStep(0);

      // Decode URL params
      const params = decodeComparisonFromURL(searchParams);
      
      if (!params) {
        setError('Invalid or missing parameters. Please provide repo, path, v1, and v2.');
        setLoading(false);
        return;
      }

      try {
        setProgressMessage('Initializing analysis...');
        setProgressStep(1);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setProgressMessage('Cloning repository...');
        setProgressStep(2);
        
        const progressMessages = [
          'Cloning repository...',
          'Extracting version 1...',
          'Extracting version 2...',
          'Building chart dependencies...',
          'Rendering Helm templates...',
          'Analyzing changes...'
        ];

        let progressInterval: NodeJS.Timeout | null = null;
        let messageInterval: NodeJS.Timeout | null = null;

        try {
          progressInterval = setInterval(() => {
            setProgressStep((prev) => {
              if (prev < 6) return prev + 1;
              return prev;
            });
          }, 2000);

          let messageIndex = 0;
          messageInterval = setInterval(() => {
            if (messageIndex < progressMessages.length - 1) {
              messageIndex++;
              setProgressMessage(progressMessages[messageIndex]);
            }
          }, 2000);

          const response = await fetch(API_ENDPOINTS.compare, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
          });

          if (progressInterval) clearInterval(progressInterval);
          if (messageInterval) clearInterval(messageInterval);
          progressInterval = null;
          messageInterval = null;

          setProgressMessage('Processing results...');
          setProgressStep(6);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: CompareResponse = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Comparison failed');
          }

          setProgressMessage('Analysis complete!');
          setProgressStep(7);

          setResult(data);
          
          // Generate risk assessment if we have structured diff data
          if (data.structuredDiff && data.structuredDiff.resources) {
            const assessment = assessRisk(data.structuredDiff.resources);
            setSummary(assessment);
          }
        } catch (err: any) {
          if (progressInterval) clearInterval(progressInterval);
          if (messageInterval) clearInterval(messageInterval);
          throw err;
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
    // If we have a stored compareId from the result, use that for a permanent link
    const compareId = result?.structuredDiff?.metadata?.compareId;
    
    let shareableURL: string;
    if (compareId) {
      // Permanent link to stored result
      shareableURL = `${window.location.origin}/analysis/${compareId}`;
    } else {
      // Fallback to URL-encoded parameters
      const params = decodeComparisonFromURL(searchParams);
      if (!params) return;
      shareableURL = createShareableURL(params as CompareRequest);
    }
    
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

  // Helper to extract org/repo from URL
  const getRepoShortName = (url: string) => {
    try {
      const match = url.match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
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
            message={progressMessage}
            step={progressStep}
            totalSteps={progressTotal}
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
        padding: SPACING.xl,
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
            fontSize: '24px',
            fontWeight: 700,
            color: '#dc2626',
            marginBottom: SPACING.md,
          }}>
            Analysis Failed
          </h1>
          <p style={{
            color: '#64748b',
            marginBottom: SPACING.xl,
            lineHeight: '1.6',
            fontSize: '15px',
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
              fontSize: '15px',
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
  const params = decodeComparisonFromURL(searchParams);
  const hasInputs = params && (params.valuesFile || params.valuesContent);

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
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: SPACING.md,
          }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                marginBottom: '4px',
              }}>
                Analysis Results
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: 0,
              }}>
                Comprehensive Helm chart comparison
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: SPACING.sm,
              flexWrap: 'wrap',
            }}>
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

        {/* Stored Result Info Banner */}
        {result?.structuredDiff?.metadata?.compareId && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.lg,
            marginBottom: SPACING.xl,
            color: 'white',
            boxShadow: SHADOWS.md,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: SPACING.md,
            }}>
              <div style={{ fontSize: '24px', flexShrink: 0 }}>💾</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: SPACING.xs,
                }}>
                  Result Saved
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.95,
                  marginBottom: SPACING.sm,
                }}>
                  This analysis has been stored and can be shared via a permanent link.
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: BORDER_RADIUS.md,
                  padding: `${SPACING.sm} ${SPACING.md}`,
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  wordBreak: 'break-all',
                  backdropFilter: 'blur(10px)',
                }}>
                  {window.location.origin}/analysis/{result.structuredDiff.metadata.compareId}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Context Section */}
        {params && (
          <div style={{
            background: 'white',
            borderRadius: BORDER_RADIUS.xl,
            padding: SPACING.xl,
            boxShadow: SHADOWS.md,
            border: '1px solid #e5e7eb',
            marginBottom: SPACING.xl,
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: SPACING.lg,
              letterSpacing: '-0.01em',
            }}>
              Analysis Context
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: SPACING.lg,
            }}>
              {/* Repository */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: SPACING.xs,
                }}>
                  Repository
                </div>
                <a
                  href={params.repository || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '14px',
                    color: BRAND_COLORS.primary,
                    textDecoration: 'none',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {params.repository ? getRepoShortName(params.repository) : 'Unknown'}
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>↗</span>
                </a>
              </div>

              {/* Chart Path */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: SPACING.xs,
                }}>
                  Chart Path
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#374151',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 500,
                }}>
                  {params.chartPath}
                </div>
              </div>

              {/* Version Comparison */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: SPACING.xs,
                }}>
                  Version Comparison
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.sm,
                  fontSize: '14px',
                }}>
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 10px',
                    borderRadius: BORDER_RADIUS.sm,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '13px',
                  }}>
                    {params.version1}
                  </span>
                  <span style={{ color: '#9ca3af', fontWeight: 500 }}>→</span>
                  <span style={{
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '4px 10px',
                    borderRadius: BORDER_RADIUS.sm,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '13px',
                  }}>
                    {params.version2}
                  </span>
                </div>
              </div>

              {/* Inputs */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: SPACING.xs,
                }}>
                  Configuration
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: 500,
                }}>
                  {params.valuesFile ? (
                    <span>{params.valuesFile}</span>
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Defaults only</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Results Layout: Summary at top, Explorer below */}
        {result && (
          <>
            {/* Summary Section */}
            {summary && (
              <div style={{ marginBottom: SPACING.xl }}>
                <ImpactSummaryComponent 
                  summary={summary}
                />
              </div>
            )}

            {/* Detailed Explorer Section */}
            <div style={{
              background: 'white',
              borderRadius: BORDER_RADIUS.xl,
              boxShadow: SHADOWS.md,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              <DiffExplorer result={result} />
            </div>
          </>
        )}
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
            Loading Analysis
          </div>
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
