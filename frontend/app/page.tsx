'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CompareForm } from '@/components/CompareForm';
import { DemoExamples } from '@/components/DemoExamples';
import { CompareRequest } from '@/lib/types';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';
import { 
  decodeComparisonFromURL, 
  getCurrentURLParams,
  buildAnalysisURL
} from '@/lib/url-state';

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState<CompareRequest | undefined>(undefined);

  // Load comparison from URL on mount (just to populate form, not execute)
  useEffect(() => {
    const urlParams = getCurrentURLParams();
    const urlComparison = decodeComparisonFromURL(urlParams);
    
    if (urlComparison) {
      setFormData(urlComparison as CompareRequest);
    }
  }, []);

  const handleCompare = (formData: CompareRequest) => {
    // Navigate immediately to analysis page
    const analysisURL = buildAnalysisURL(formData);
    router.push(analysisURL);
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
          loading={false} 
          initialData={formData} 
        />
      </div>
    </main>
  );
}
