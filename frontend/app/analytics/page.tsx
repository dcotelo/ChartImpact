'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';

interface ChartPopularity {
  repository: string;
  chartPath: string;
  comparisonCount: number;
  withChanges: number;
  avgModified: number;
  lastComparisonAt: string;
}

interface AnalyticsData {
  success: boolean;
  popularCharts: ChartPopularity[];
  totalComparisons: number;
  periodStart: string;
  periodEnd: string;
  error?: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/analytics/charts/popular`);
        
        if (!response.ok) {
          throw new Error(`Failed to load analytics: ${response.status}`);
        }
        
        const analyticsData: AnalyticsData = await response.json();
        
        if (!analyticsData.success) {
          throw new Error(analyticsData.error || 'Failed to load analytics');
        }
        
        setData(analyticsData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, []);

  const getRepoShortName = (repoUrl: string): string => {
    try {
      const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
      return match ? match[1] : repoUrl;
    } catch {
      return repoUrl;
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        padding: `${SPACING.xl} ${SPACING.md}`,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          paddingTop: '10vh',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: SPACING.md,
          }}>📊</div>
          <p style={{
            fontSize: '18px',
            color: '#6b7280',
          }}>
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        padding: `${SPACING.xl} ${SPACING.md}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          padding: `${SPACING.xl} ${SPACING['2xl']}`,
          boxShadow: SHADOWS.lg,
          maxWidth: '500px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '56px', marginBottom: SPACING.lg }}>⚠️</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#dc2626',
            marginBottom: SPACING.md,
          }}>
            Failed to Load Analytics
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: SPACING.xl,
          }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: BRAND_COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: BORDER_RADIUS.md,
              padding: `${SPACING.sm} ${SPACING.lg}`,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: `${SPACING.xl} ${SPACING.md}`,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          padding: `${SPACING.lg} ${SPACING.xl}`,
          marginBottom: SPACING.xl,
          boxShadow: SHADOWS.md,
          border: '1px solid #e5e7eb',
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
                Analytics Dashboard
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: 0,
              }}>
                Insights from the last 90 days • {data.totalComparisons} total comparisons
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
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
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = SHADOWS.sm;
              }}
            >
              New Comparison
            </button>
          </div>
        </div>

        {/* Popular Charts */}
        <div style={{
          background: 'white',
          borderRadius: BORDER_RADIUS.xl,
          padding: SPACING.xl,
          boxShadow: SHADOWS.md,
          border: '1px solid #e5e7eb',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: SPACING.lg,
          }}>
            📈 Most Compared Charts
          </h2>

          {data.popularCharts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: `${SPACING.xl} ${SPACING.md}`,
              color: '#9ca3af',
            }}>
              <p style={{ fontSize: '48px', marginBottom: SPACING.md }}>📊</p>
              <p style={{ fontSize: '14px' }}>No comparison data yet</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: SPACING.lg,
            }}>
              {data.popularCharts.map((chart, index) => {
                const changeRate = chart.comparisonCount > 0 
                  ? (chart.withChanges / chart.comparisonCount) * 100 
                  : 0;

                return (
                  <div
                    key={`${chart.repository}-${chart.chartPath}`}
                    style={{
                      background: '#f9fafb',
                      borderRadius: BORDER_RADIUS.lg,
                      padding: SPACING.lg,
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = SHADOWS.md;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Rank Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: SPACING.md,
                    }}>
                      <div style={{
                        background: index === 0 ? '#fef3c7' : index === 1 ? '#e0e7ff' : '#f3f4f6',
                        color: index === 0 ? '#92400e' : index === 1 ? '#3730a3' : '#374151',
                        fontSize: '14px',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: BORDER_RADIUS.sm,
                      }}>
                        #{index + 1}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                      }}>
                        {chart.comparisonCount} {chart.comparisonCount === 1 ? 'comparison' : 'comparisons'}
                      </div>
                    </div>

                    {/* Repository */}
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
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: BRAND_COLORS.primary,
                      marginBottom: SPACING.md,
                      wordBreak: 'break-word',
                    }}>
                      {getRepoShortName(chart.repository)}
                    </div>

                    {/* Chart Path */}
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
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, monospace',
                      color: '#374151',
                      marginBottom: SPACING.lg,
                      wordBreak: 'break-word',
                    }}>
                      {chart.chartPath}
                    </div>

                    {/* Statistics */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: SPACING.md,
                      paddingTop: SPACING.md,
                      borderTop: '1px solid #e5e7eb',
                    }}>
                      <div>
                        <div style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          marginBottom: '2px',
                        }}>
                          Change Rate
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: changeRate > 70 ? '#dc2626' : changeRate > 40 ? '#f59e0b' : '#10b981',
                        }}>
                          {changeRate.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          marginBottom: '2px',
                        }}>
                          Avg Modified
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#374151',
                        }}>
                          {chart.avgModified.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Last Comparison */}
                    <div style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      marginTop: SPACING.sm,
                    }}>
                      Last compared: {new Date(chart.lastComparisonAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
