import React from 'react';
import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from '@/lib/design-tokens';

interface ErrorScreenProps {
  title: string;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function ErrorScreen({ 
  title, 
  message, 
  onAction, 
  actionLabel = 'Go Back' 
}: ErrorScreenProps) {
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
          {title}
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: SPACING.xl,
          lineHeight: 1.6,
        }}>
          {message}
        </p>
        {onAction && (
          <button
            onClick={onAction}
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
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
