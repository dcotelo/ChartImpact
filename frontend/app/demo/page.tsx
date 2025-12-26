'use client';

import { DiffExplorer } from '@/components/explorer/DiffExplorer';
import { mockDiffResultV2 } from '@/lib/mock-data';

export default function DemoPage() {
  const mockResult = {
    success: true,
    diff: 'Mock diff output...',
    version1: 'argo-cd-9.1.5',
    version2: 'argo-cd-9.1.6'
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <DiffExplorer 
        result={mockResult}
        diffData={mockDiffResultV2}
      />
    </div>
  );
}
