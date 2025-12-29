import { SPACING, BRAND_COLORS, BORDER_RADIUS, SHADOWS } from './design-tokens';

/**
 * Common reusable style objects to reduce inline style duplication
 */

export const buttonPrimaryStyle: React.CSSProperties = {
  padding: '0.875rem 2rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: BORDER_RADIUS.md,
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

export const buttonSecondaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: BORDER_RADIUS.md,
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.xl,
  padding: `${SPACING['2xl']} ${SPACING.xl}`,
  boxShadow: SHADOWS.lg,
};

export const cardCompactStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.lg,
  padding: SPACING.lg,
  boxShadow: SHADOWS.md,
};

export const fullscreenCenterStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${SPACING['2xl']} ${SPACING.xl}`,
  background: '#f8f9fa',
};

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #ddd',
  borderRadius: BORDER_RADIUS.md,
  fontSize: '1rem',
  backgroundColor: '#fff',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '600',
  color: '#333',
};

export const errorTextStyle: React.CSSProperties = {
  color: '#d32f2f',
  fontSize: '0.75rem',
  display: 'block',
  marginTop: '0.25rem',
};

export const helperTextStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '0.75rem',
  display: 'block',
  marginTop: '0.25rem',
};

// Analysis page specific styles
export const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8f9fa',
  padding: `${SPACING.xl} ${SPACING.md}`,
};

export const contentWrapperStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
};

export const headerCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.xl,
  padding: `${SPACING.lg} ${SPACING.xl}`,
  marginBottom: SPACING.lg,
  boxShadow: SHADOWS.md,
  border: '1px solid #e2e8f0',
};

export const flexBetweenStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: SPACING.md,
};

export const flexCenterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
};

export const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: SPACING.sm,
  alignItems: 'center',
};

export const gradientTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  background: `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: 0,
};

export const badgeGrayStyle: React.CSSProperties = {
  background: '#f3f4f6',
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: BORDER_RADIUS.sm,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const warningBadgeStyle: React.CSSProperties = {
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
};

export const subtextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  margin: 0,
  marginBottom: SPACING.xs,
};

export const actionButtonStyle: React.CSSProperties = {
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
};

export const secondaryActionButtonStyle: React.CSSProperties = {
  background: 'white',
  color: '#64748b',
  border: '1.5px solid #e2e8f0',
  borderRadius: BORDER_RADIUS.md,
  padding: `${SPACING.sm} ${SPACING.md}`,
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.xs,
};

export const primaryActionButtonStyle: React.CSSProperties = {
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
};

export const resultCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.xl,
  boxShadow: SHADOWS.md,
  border: '1px solid #e5e7eb',
  overflow: 'hidden',
};

export const suspenseFallbackStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8f9fa',
};

export const suspenseCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.xl,
  padding: SPACING.xl,
  boxShadow: SHADOWS.md,
  border: '1px solid #e5e7eb',
  maxWidth: '400px',
  textAlign: 'center',
};

export const suspenseTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1f2937',
  marginBottom: SPACING.md,
  letterSpacing: '-0.01em',
};
