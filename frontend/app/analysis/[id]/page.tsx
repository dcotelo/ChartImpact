export const runtime = 'edge';

import { Suspense } from 'react';
import { StoredAnalysisContent } from './StoredAnalysisContent';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import {
  suspenseFallbackStyle,
  suspenseCardStyle,
  suspenseTitleStyle,
} from '@/lib/common-styles';

export default async function StoredAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      <StoredAnalysisContent id={id} />
    </Suspense>
  );
}
