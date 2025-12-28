'use client';

import { useState, useEffect } from 'react';
import { CompareForm } from '@/components/CompareForm';
import { DemoExamples } from '@/components/DemoExamples';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { DiffExplorer } from '@/components/explorer/DiffExplorer';
import { ImpactSummaryComponent } from '@/components/ImpactSummary';
import { CompareResponse, CompareRequest, ImpactSummary } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/api-config';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';
import { 
  decodeComparisonFromURL, 
  updateBrowserURL, 
  getCurrentURLParams 
} from '@/lib/url-state';
import { assessRisk } from '@/lib/risk-assessment';

export default function Home() {
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompareRequest | undefined>(undefined);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressStep, setProgressStep] = useState<number>(0);
  const [progressTotal] = useState<number>(7);
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);

  // Load comparison from URL on mount
  useEffect(() => {
    const urlParams = getCurrentURLParams();
    const urlComparison = decodeComparisonFromURL(urlParams);
    
    if (urlComparison) {
      // Auto-load comparison from URL
      setFormData(urlComparison as CompareRequest);
      // Optionally auto-run the comparison
      // handleCompare(urlComparison as CompareRequest);
    }
  }, []);

  const handleCompare = async (formData: CompareRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep(0);
    
    // Update URL with comparison parameters
    updateBrowserURL(formData);
    
    // Progress steps: 1-Initializing, 2-Cloning, 3-Extracting v1, 4-Extracting v2, 
    // 5-Building dependencies, 6-Rendering templates, 7-Comparing
    
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
          body: JSON.stringify(formData),
        });

        if (progressInterval) clearInterval(progressInterval);
        if (messageInterval) clearInterval(messageInterval);
        progressInterval = null;
        messageInterval = null;

        setProgressMessage('Processing results...');
        setProgressStep(6);

        let data: CompareResponse;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error(`Failed to parse response: ${response.statusText || 'Unknown error'}`);
        }

        if (!response.ok || !data.success) {
          const errorMsg = data?.error || 'Failed to compare versions';
          throw new Error(errorMsg);
        }

        setProgressMessage('Analysis complete!');
        setProgressStep(7);
        setResult(data);
        
        // Generate impact summary if we have structured diff data
        if (data.structuredDiff && data.structuredDiff.resources) {
          const summary = assessRisk(data.structuredDiff.resources);
          setImpactSummary(summary);
          setShowExplorer(false); // Start with summary view
        } else {
          setImpactSummary(null);
          setShowExplorer(true); // Go straight to explorer if no structured data
        }
        
        setTimeout(() => {
          setProgressMessage('');
          setProgressStep(0);
        }, 1500);
      } catch (err: any) {
        if (progressInterval) clearInterval(progressInterval);
        if (messageInterval) clearInterval(messageInterval);
        throw err;
      }
    } catch (err: any) {
      let errorMessage = 'An error occurred';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request was cancelled';
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error: Could not connect to the server. Please check your connection and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProgressMessage('');
      setProgressStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: BORDER_RADIUS.xl,
      boxShadow: SHADOWS['2xl'],
      overflow: 'hidden'
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%)`,
        padding: SPACING.xl,
        color: 'white'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: SPACING.sm,
          fontWeight: 'bold'
        }}>
          🔍 ChartImpact
        </h1>
        <p style={{
          fontSize: '1.1rem',
          opacity: 0.9
        }}>
          Understand deployment risk before upgrading Helm charts
        </p>
      </div>

      <div style={{ padding: SPACING.xl }}>
        <DemoExamples onSelectExample={(data) => {
          setFormData(data);
        }} />
        <CompareForm 
          key={formData ? JSON.stringify(formData) : 'empty'}
          onSubmit={handleCompare} 
          loading={loading} 
          initialData={formData} 
        />

        {loading && progressMessage && (
          <ProgressIndicator 
            message={progressMessage}
            step={progressStep}
            totalSteps={progressTotal}
          />
        )}

        {error && (
          <div style={{
            marginTop: SPACING.lg,
            padding: SPACING.lg,
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: BORDER_RADIUS.md,
            color: '#c33'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
              marginBottom: SPACING.sm
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <strong style={{ fontSize: '1.1rem' }}>Error</strong>
            </div>
            <div style={{
              paddingLeft: '1.75rem',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {error}
            </div>
          </div>
        )}

        {result && (
          <>
            <div style={{ 
              marginTop: SPACING.lg,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: SPACING.sm
            }}>
              <button
                onClick={() => {
                  if (formData) {
                    const url = typeof window !== 'undefined' ? window.location.href : '';
                    navigator.clipboard.writeText(url).then(() => {
                      // Success - could add a toast notification in the future
                      console.log('Link copied to clipboard');
                    }).catch(() => {
                      // Fallback for older browsers
                      alert('Link copied to clipboard!');
                    });
                  }
                }}
                style={{
                  padding: `${SPACING.sm} ${SPACING.md}`,
                  background: BRAND_COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: BORDER_RADIUS.sm,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.xs
                }}
              >
                🔗 Copy Link
              </button>
            </div>
            
            {/* Show Impact Summary first, then Explorer on demand */}
            {impactSummary && !showExplorer ? (
              <ImpactSummaryComponent 
                summary={impactSummary}
                onViewExplorer={() => setShowExplorer(true)}
              />
            ) : (
              <div style={{ marginTop: SPACING.md }}>
                <DiffExplorer 
                  result={result}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
