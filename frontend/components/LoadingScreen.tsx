import React from 'react';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';
import { ProgressIndicator } from './ProgressIndicator';

interface LoadingScreenProps {
  message: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
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
          message={message}
          step={1}
          totalSteps={1}
        />
      </div>
    </div>
  );
}
